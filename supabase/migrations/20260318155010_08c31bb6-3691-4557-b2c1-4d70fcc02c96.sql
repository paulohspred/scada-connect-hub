
-- Enum for device status
CREATE TYPE public.device_status AS ENUM ('pending', 'approved', 'online', 'offline');

-- Enum for device type
CREATE TYPE public.device_type AS ENUM ('RTU', 'CLP', 'Modem');

-- Enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'operator', 'viewer');

-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Devices table (CORE)
CREATE TABLE public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  identifier TEXT NOT NULL UNIQUE,
  status device_status NOT NULL DEFAULT 'pending',
  scada_port INTEGER UNIQUE,
  last_ip TEXT,
  last_seen TIMESTAMPTZ DEFAULT now(),
  lat DOUBLE PRECISION DEFAULT 0,
  lng DOUBLE PRECISION DEFAULT 0,
  model TEXT DEFAULT '',
  brand TEXT DEFAULT '',
  type device_type NOT NULL DEFAULT 'Modem',
  signal_dbm INTEGER DEFAULT 0,
  bytes_tx BIGINT DEFAULT 0,
  bytes_rx BIGINT DEFAULT 0,
  observation TEXT DEFAULT '',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view devices" ON public.devices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and operators can insert devices" ON public.devices FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));
CREATE POLICY "Admins and operators can update devices" ON public.devices FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));
CREATE POLICY "Only admins can delete devices" ON public.devices FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON public.devices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Connections table (session tracking)
CREATE TABLE public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  disconnected_at TIMESTAMPTZ,
  bytes_tx BIGINT DEFAULT 0,
  bytes_rx BIGINT DEFAULT 0,
  source_ip TEXT,
  source_port INTEGER
);

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view connections" ON public.connections FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert connections" ON public.connections FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));

-- Events table (audit log)
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view events" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert events" ON public.events FOR INSERT TO authenticated
  WITH CHECK (true);

-- Gateway settings table
CREATE TABLE public.gateway_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gateway_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view settings" ON public.gateway_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage settings" ON public.gateway_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to approve device (atomic operation with port assignment)
CREATE OR REPLACE FUNCTION public.approve_device(
  _device_id UUID,
  _name TEXT,
  _lat DOUBLE PRECISION,
  _lng DOUBLE PRECISION,
  _type device_type,
  _brand TEXT,
  _model TEXT,
  _observation TEXT DEFAULT ''
)
RETURNS public.devices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _port INTEGER;
  _device public.devices;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator')) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT COALESCE(MAX(scada_port), 9000) + 1 INTO _port FROM public.devices WHERE scada_port IS NOT NULL;

  UPDATE public.devices SET
    name = _name,
    status = 'approved',
    scada_port = _port,
    lat = _lat,
    lng = _lng,
    type = _type,
    brand = _brand,
    model = _model,
    observation = _observation,
    approved_by = auth.uid(),
    approved_at = now()
  WHERE id = _device_id AND status = 'pending'
  RETURNING * INTO _device;

  IF _device IS NULL THEN
    RAISE EXCEPTION 'Device not found or not pending';
  END IF;

  INSERT INTO public.events (type, device_id, user_id, message)
  VALUES ('device_approved', _device_id, auth.uid(), 'Device ' || _name || ' approved → Port ' || _port);

  RETURN _device;
END;
$$;

-- Function to reject device
CREATE OR REPLACE FUNCTION public.reject_device(_device_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator')) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  DELETE FROM public.devices WHERE id = _device_id AND status = 'pending';

  INSERT INTO public.events (type, device_id, user_id, message)
  VALUES ('device_rejected', _device_id, auth.uid(), 'Device rejected and removed');
END;
$$;

-- Auto-create profile and assign role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'viewer');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes
CREATE INDEX idx_devices_status ON public.devices(status);
CREATE INDEX idx_devices_scada_port ON public.devices(scada_port);
CREATE INDEX idx_connections_device_id ON public.connections(device_id);
CREATE INDEX idx_events_device_id ON public.events(device_id);
CREATE INDEX idx_events_created_at ON public.events(created_at DESC);

-- Insert default gateway settings
INSERT INTO public.gateway_settings (key, value) VALUES
  ('port_range_input', '{"min": 7000, "max": 8000}'),
  ('port_range_scada', '{"min": 9001, "max": 10000}'),
  ('tcp_timeout', '{"seconds": 300}'),
  ('auto_identify', '{"enabled": true}');
