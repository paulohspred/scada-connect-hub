-- ============================================================
-- Device Modes Migration
-- Date: 2026-03-30
-- Adds device_mode enum and mode column to devices table
-- ============================================================

-- 1. Create device_mode enum
CREATE TYPE public.device_mode AS ENUM (
  'normal',       -- Standard operation
  'traffic',      -- High-traffic monitoring mode (shows detailed throughput)
  'silent',       -- Silent mode: no alerts, no offline notifications
  'maintenance'   -- Under maintenance: excluded from dashboards and alerts
);

-- 2. Add mode column with default 'normal'
ALTER TABLE public.devices
  ADD COLUMN mode public.device_mode NOT NULL DEFAULT 'normal';

-- 3. Function to change device mode (respects RLS)
CREATE OR REPLACE FUNCTION public.set_device_mode(
  _device_id UUID,
  _mode public.device_mode
)
RETURNS public.devices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _device public.devices;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator')) THEN
    RAISE EXCEPTION 'Permission denied: only admins and operators can change device mode';
  END IF;

  UPDATE public.devices
  SET mode = _mode, updated_at = now()
  WHERE id = _device_id
  RETURNING * INTO _device;

  IF _device IS NULL THEN
    RAISE EXCEPTION 'Device not found: %', _device_id;
  END IF;

  -- Log the mode change as an event
  INSERT INTO public.events (type, device_id, user_id, message)
  VALUES (
    'device_mode_changed',
    _device_id,
    auth.uid(),
    'Device ' || COALESCE(_device.name, _device.identifier) || ' mode changed to ' || _mode
  );

  RETURN _device;
END;
$$;

-- 4. Grant execute to authenticated users (RLS check is inside the function)
GRANT EXECUTE ON FUNCTION public.set_device_mode(UUID, public.device_mode) TO authenticated;

-- 5. Index for filtering by mode
CREATE INDEX IF NOT EXISTS idx_devices_mode ON public.devices(mode);
