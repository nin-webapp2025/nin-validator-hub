-- F3: Admin cross-user visibility
-- Allow admins to SELECT all rows in history tables

-- validation_history
CREATE POLICY "Admins can view all validation_history"
  ON validation_history
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- personalization_history
CREATE POLICY "Admins can view all personalization_history"
  ON personalization_history
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- clearance_history
CREATE POLICY "Admins can view all clearance_history"
  ON clearance_history
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- bvn_history
CREATE POLICY "Admins can view all bvn_history"
  ON bvn_history
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- nin_modification_requests (admin can already see via existing policies, but add explicit SELECT)
CREATE POLICY "Admins can view all nin_modification_requests"
  ON nin_modification_requests
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));
