-- Rename the legacy 'print_nin_slip' operation key in wallet_transactions
-- to the new split keys. Since the old code used a single key regardless of
-- slip type, we conservatively map all historical rows to the cheaper
-- 'print_nin_slip_long' key so existing records remain consistent.
-- New transactions will correctly use 'print_nin_slip_premium' or
-- 'print_nin_slip_long' as set by the updated application code.

UPDATE wallet_transactions
SET operation = 'print_nin_slip_long'
WHERE operation = 'print_nin_slip';
