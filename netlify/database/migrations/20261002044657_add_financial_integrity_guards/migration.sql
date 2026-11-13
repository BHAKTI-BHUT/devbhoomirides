-- Financial records are append-only: never deleted, amounts never rewritten.
-- Corrections must be new reversal/adjustment rows.
CREATE OR REPLACE FUNCTION forbid_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% rows cannot be deleted', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION forbid_update() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% rows cannot be modified', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION forbid_amount_change() RETURNS trigger AS $$
BEGIN
  IF NEW.amount IS DISTINCT FROM OLD.amount OR NEW.type IS DISTINCT FROM OLD.type
     OR NEW.direction IS DISTINCT FROM OLD.direction OR NEW.mode IS DISTINCT FROM OLD.mode THEN
    RAISE EXCEPTION 'ledger amount, type, direction and mode are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION forbid_commission_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'commission snapshots are immutable';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER payments_no_delete BEFORE DELETE ON payments FOR EACH ROW EXECUTE FUNCTION forbid_delete();
--> statement-breakpoint
CREATE TRIGGER payment_events_no_delete BEFORE DELETE ON payment_events FOR EACH ROW EXECUTE FUNCTION forbid_delete();
--> statement-breakpoint
CREATE TRIGGER refunds_no_delete BEFORE DELETE ON refunds FOR EACH ROW EXECUTE FUNCTION forbid_delete();
--> statement-breakpoint
CREATE TRIGGER payouts_no_delete BEFORE DELETE ON payouts FOR EACH ROW EXECUTE FUNCTION forbid_delete();
--> statement-breakpoint
CREATE TRIGGER wallets_no_delete BEFORE DELETE ON wallets FOR EACH ROW EXECUTE FUNCTION forbid_delete();
--> statement-breakpoint
CREATE TRIGGER wallet_transactions_no_delete BEFORE DELETE ON wallet_transactions FOR EACH ROW EXECUTE FUNCTION forbid_delete();
--> statement-breakpoint
CREATE TRIGGER wallet_transactions_immutable BEFORE UPDATE ON wallet_transactions FOR EACH ROW EXECUTE FUNCTION forbid_amount_change();
--> statement-breakpoint
CREATE TRIGGER commissions_no_delete BEFORE DELETE ON commissions FOR EACH ROW EXECUTE FUNCTION forbid_delete();
--> statement-breakpoint
CREATE TRIGGER commissions_no_update BEFORE UPDATE ON commissions FOR EACH ROW EXECUTE FUNCTION forbid_commission_change();
--> statement-breakpoint
CREATE TRIGGER financial_settings_no_delete BEFORE DELETE ON financial_settings FOR EACH ROW EXECUTE FUNCTION forbid_delete();
--> statement-breakpoint
CREATE TRIGGER financial_settings_no_update BEFORE UPDATE ON financial_settings FOR EACH ROW EXECUTE FUNCTION forbid_update();
--> statement-breakpoint
CREATE TRIGGER audit_logs_no_delete BEFORE DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION forbid_delete();
--> statement-breakpoint
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE ON audit_logs FOR EACH ROW EXECUTE FUNCTION forbid_update();
--> statement-breakpoint
-- Default financial settings (version 1): 15% commission, no booking fee, INR, manual payouts.
INSERT INTO financial_settings (commission_rate, booking_fee, currency, payout_mode, free_cancellation_hours, late_refund_percent, no_refund_hours, cancellation_fee, booking_fee_refundable, driver_cancel_refund_percent, driver_cancel_penalty, refund_approval)
VALUES (15.00, 0, 'INR', 'manual', 24, 75, 6, 0, false, 100, 0, 'automatic');
