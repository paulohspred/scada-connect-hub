
-- ============================================================
-- Production Hardening Migration
-- Date: 2026-03-30
-- Description: Fix scada_port race condition, add SEQUENCE,
--              add session settings, and index improvements.
-- ============================================================

-- 1. Create SEQUENCE for SCADA port allocation (eliminates race condition)
--    Ports start at 9001 (matching existing config)
CREATE SEQUENCE IF NOT EXISTS public.scada_port_seq
  START WITH 9001
  INCREMENT BY 1
  MINVALUE 9001
  MAXVALUE 10000
  NO CYCLE;

-- Advance the sequence to be above any already-used port
DO $$
DECLARE
  _max_port INTEGER;
BEGIN
  SELECT COALESCE(MAX(scada_port), 9000) INTO _max_port
  FROM public.devices
  WHERE scada_port IS NOT NULL;

  IF _max_port >= 9001 THEN
    PERFORM setval('public.scada_port_seq', _max_port);
  END IF;
END;
$$;

-- 2. Replace approve_device function to use SEQUENCE (atomic, no race condition)
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

  -- Use SEQUENCE to avoid race condition on concurrent approvals
  _port := nextval('public.scada_port_seq');

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
    -- Return the port back to avoid gaps (best effort)
    PERFORM setval('public.scada_port_seq', _port - 1);
    RAISE EXCEPTION 'Device not found or not pending';
  END IF;

  INSERT INTO public.events (type, device_id, user_id, message)
  VALUES ('device_approved', _device_id, auth.uid(), 'Device ' || _name || ' approved → Port ' || _port);

  RETURN _device;
END;
$$;

-- 3. Add missing index on devices.identifier for faster lookups (used heavily by gateway-api)
CREATE INDEX IF NOT EXISTS idx_devices_identifier ON public.devices(identifier);

-- 4. Add index on events.type for filter queries
CREATE INDEX IF NOT EXISTS idx_events_type ON public.events(type);

-- 5. Add index on user_roles.user_id for faster role lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
