
-- Fix permissive INSERT policy on events table
DROP POLICY "System can insert events" ON public.events;
CREATE POLICY "Authenticated users can insert events" ON public.events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));
