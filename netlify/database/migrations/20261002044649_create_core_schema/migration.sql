CREATE TYPE "account_status" AS ENUM('active', 'inactive', 'suspended', 'archived');--> statement-breakpoint
CREATE TYPE "booking_status" AS ENUM('pending_payment', 'confirmed', 'payment_failed', 'expired', 'cancelled_by_customer', 'cancelled_by_driver', 'cancelled_by_system', 'completed', 'no_show');--> statement-breakpoint
CREATE TYPE "complaint_category" AS ENUM('driver', 'vehicle', 'booking', 'payment', 'other');--> statement-breakpoint
CREATE TYPE "complaint_status" AS ENUM('open', 'in_review', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "document_type" AS ENUM('profile_photo', 'driving_licence', 'vehicle_rc', 'vehicle_photo', 'other');--> statement-breakpoint
CREATE TYPE "financial_mode" AS ENUM('test', 'live');--> statement-breakpoint
CREATE TYPE "notification_channel" AS ENUM('in_app', 'email', 'sms', 'whatsapp', 'push');--> statement-breakpoint
CREATE TYPE "payment_status" AS ENUM('created', 'pending', 'paid', 'failed', 'cancelled', 'refund_pending', 'partially_refunded', 'refunded');--> statement-breakpoint
CREATE TYPE "payout_method" AS ENUM('bank_transfer', 'upi', 'other');--> statement-breakpoint
CREATE TYPE "payout_status" AS ENUM('pending', 'approved', 'processing', 'paid', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "record_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TYPE "refund_status" AS ENUM('requested', 'approved', 'processing', 'completed', 'failed', 'rejected');--> statement-breakpoint
CREATE TYPE "review_status" AS ENUM('published', 'hidden');--> statement-breakpoint
CREATE TYPE "trip_status" AS ENUM('draft', 'published', 'booking_open', 'fully_booked', 'trip_started', 'trip_completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "txn_direction" AS ENUM('credit', 'debit', 'memo');--> statement-breakpoint
CREATE TYPE "txn_status" AS ENUM('pending', 'available', 'paid', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "txn_type" AS ENUM('booking_payment', 'platform_commission', 'platform_fee', 'driver_earning', 'driver_payout', 'refund', 'partial_refund', 'cancellation_charge', 'commission_reversal', 'driver_earning_reversal', 'adjustment', 'admin_credit', 'admin_debit');--> statement-breakpoint
CREATE TYPE "user_role" AS ENUM('customer', 'driver', 'admin');--> statement-breakpoint
CREATE TYPE "verification_status" AS ENUM('pending', 'verified', 'rejected', 'suspended');--> statement-breakpoint
CREATE SEQUENCE "public"."booking_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 124 CACHE 1;--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"actor_id" uuid,
	"actor_email" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"previous" jsonb,
	"next" jsonb,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"code" text NOT NULL UNIQUE,
	"trip_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"pickup_stop_id" uuid NOT NULL,
	"drop_stop_id" uuid NOT NULL,
	"pickup_point" text NOT NULL,
	"seats" integer NOT NULL,
	"passengers" jsonb NOT NULL,
	"contact_phone" text NOT NULL,
	"price_per_seat" integer NOT NULL,
	"subtotal" integer NOT NULL,
	"platform_fee" integer NOT NULL,
	"total_amount" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" "booking_status" DEFAULT 'pending_payment'::"booking_status" NOT NULL,
	"mode" "financial_mode" NOT NULL,
	"hold_expires_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_seats_chk" CHECK ("seats" > 0),
	CONSTRAINT "bookings_amounts_chk" CHECK ("subtotal" >= 0 and "platform_fee" >= 0 and "total_amount" = "subtotal" + "platform_fee")
);
--> statement-breakpoint
CREATE TABLE "commissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"booking_id" uuid NOT NULL UNIQUE,
	"payment_id" uuid NOT NULL UNIQUE,
	"trip_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"mode" "financial_mode" NOT NULL,
	"seats" integer NOT NULL,
	"price_per_seat" integer NOT NULL,
	"booking_amount" integer NOT NULL,
	"platform_fee" integer NOT NULL,
	"total_paid" integer NOT NULL,
	"commission_rate" numeric(5,2) NOT NULL,
	"commission_amount" integer NOT NULL,
	"driver_earning" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"settings_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commissions_split_chk" CHECK ("booking_amount" = "commission_amount" + "driver_earning"),
	CONSTRAINT "commissions_total_chk" CHECK ("total_paid" = "booking_amount" + "platform_fee"),
	CONSTRAINT "commissions_nonneg_chk" CHECK ("commission_amount" >= 0 and "driver_earning" >= 0 and "platform_fee" >= 0),
	CONSTRAINT "commissions_rate_chk" CHECK ("commission_rate" >= 0 and "commission_rate" <= 100)
);
--> statement-breakpoint
CREATE TABLE "complaints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"booking_id" uuid,
	"customer_id" uuid NOT NULL,
	"driver_id" uuid,
	"category" "complaint_category" NOT NULL,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"status" "complaint_status" DEFAULT 'open'::"complaint_status" NOT NULL,
	"resolution_note" text,
	"resolved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"driver_id" uuid NOT NULL,
	"type" "document_type" NOT NULL,
	"blob_key" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL UNIQUE,
	"display_name" text NOT NULL,
	"phone" text,
	"licence_number" text,
	"licence_expiry" date,
	"emergency_contact" text,
	"verification" "verification_status" DEFAULT 'pending'::"verification_status" NOT NULL,
	"verification_note" text,
	"verified_at" timestamp with time zone,
	"verified_by" uuid,
	"rating" real DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"completed_trips" integer DEFAULT 0 NOT NULL,
	"payout_method" "payout_method",
	"payout_upi" text,
	"payout_account_name" text,
	"payout_account_number" text,
	"payout_ifsc" text,
	"provider_fund_account_id" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"commission_rate" numeric(5,2) NOT NULL,
	"booking_fee" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"payout_mode" text DEFAULT 'manual' NOT NULL,
	"free_cancellation_hours" integer NOT NULL,
	"late_refund_percent" integer NOT NULL,
	"no_refund_hours" integer NOT NULL,
	"cancellation_fee" integer DEFAULT 0 NOT NULL,
	"booking_fee_refundable" boolean DEFAULT false NOT NULL,
	"driver_cancel_refund_percent" integer DEFAULT 100 NOT NULL,
	"driver_cancel_penalty" integer DEFAULT 0 NOT NULL,
	"refund_approval" text DEFAULT 'automatic' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fs_commission_chk" CHECK ("commission_rate" >= 0 and "commission_rate" <= 100),
	CONSTRAINT "fs_nonneg_chk" CHECK ("booking_fee" >= 0 and "cancellation_fee" >= 0 and "driver_cancel_penalty" >= 0 and "free_cancellation_hours" >= 0 and "no_refund_hours" >= 0),
	CONSTRAINT "fs_percent_chk" CHECK ("late_refund_percent" between 0 and 100 and "driver_cancel_refund_percent" between 0 and 100),
	CONSTRAINT "fs_window_chk" CHECK ("no_refund_hours" <= "free_cancellation_hours")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"booking_id" uuid,
	"channel" "notification_channel" DEFAULT 'in_app'::"notification_channel" NOT NULL,
	"delivery_status" text DEFAULT 'delivered' NOT NULL,
	"dedupe_key" text UNIQUE,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"provider" text NOT NULL,
	"event_id" text NOT NULL UNIQUE,
	"event_type" text NOT NULL,
	"payment_id" uuid,
	"order_id" text,
	"provider_payment_id" text,
	"payload" jsonb,
	"processed_at" timestamp with time zone,
	"processing_result" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"booking_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"mode" "financial_mode" NOT NULL,
	"order_id" text NOT NULL UNIQUE,
	"provider_payment_id" text UNIQUE,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"method" text,
	"status" "payment_status" DEFAULT 'created'::"payment_status" NOT NULL,
	"failure_reason" text,
	"gateway_reference" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_chk" CHECK ("amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"driver_id" uuid NOT NULL,
	"wallet_id" uuid NOT NULL,
	"mode" "financial_mode" NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"method" "payout_method" NOT NULL,
	"destination" jsonb,
	"status" "payout_status" DEFAULT 'pending'::"payout_status" NOT NULL,
	"provider" text DEFAULT 'manual' NOT NULL,
	"provider_payout_id" text UNIQUE,
	"reference" text,
	"notes" text,
	"requested_by_driver" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"decided_by" uuid,
	"failure_reason" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payouts_amount_chk" CHECK ("amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"booking_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"mode" "financial_mode" NOT NULL,
	"amount" integer NOT NULL,
	"commission_reversal" integer DEFAULT 0 NOT NULL,
	"driver_reversal" integer DEFAULT 0 NOT NULL,
	"fee_reversal" integer DEFAULT 0 NOT NULL,
	"cancellation_charge" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"reason" text NOT NULL,
	"policy" jsonb,
	"status" "refund_status" DEFAULT 'requested'::"refund_status" NOT NULL,
	"provider_refund_id" text UNIQUE,
	"requested_by" uuid,
	"decided_by" uuid,
	"rejection_reason" text,
	"failure_reason" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refunds_amount_chk" CHECK ("amount" > 0),
	CONSTRAINT "refunds_split_chk" CHECK ("amount" = "commission_reversal" + "driver_reversal" + "fee_reversal")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"booking_id" uuid NOT NULL UNIQUE,
	"trip_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"status" "review_status" DEFAULT 'published'::"review_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_rating_chk" CHECK ("rating" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "route_stops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"route_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"offset_minutes" integer DEFAULT 0 NOT NULL,
	"distance_km" integer DEFAULT 0 NOT NULL,
	"lat" real,
	"lng" real,
	"pickup_points" jsonb DEFAULT '[]' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"slug" text NOT NULL UNIQUE,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_stops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"trip_id" uuid NOT NULL,
	"route_stop_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"eta" text NOT NULL,
	"pickup_points" jsonb DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"route_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"date" date NOT NULL,
	"departure_time" text NOT NULL,
	"departs_at" timestamp with time zone NOT NULL,
	"total_seats" integer NOT NULL,
	"booked_seats" integer DEFAULT 0 NOT NULL,
	"price_per_seat" integer NOT NULL,
	"status" "trip_status" DEFAULT 'booking_open'::"trip_status" NOT NULL,
	"is_return" boolean DEFAULT false NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"seed_key" text UNIQUE,
	"cancel_reason" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trips_seats_chk" CHECK ("total_seats" > 0 and "booked_seats" >= 0 and "booked_seats" <= "total_seats"),
	CONSTRAINT "trips_price_chk" CHECK ("price_per_seat" >= 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"identity_id" text UNIQUE,
	"email" text UNIQUE,
	"name" text DEFAULT '' NOT NULL,
	"phone" text,
	"role" "user_role" DEFAULT 'customer'::"user_role" NOT NULL,
	"status" "account_status" DEFAULT 'active'::"account_status" NOT NULL,
	"status_reason" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"driver_id" uuid NOT NULL,
	"type" text NOT NULL,
	"model" text NOT NULL,
	"registration_number" text NOT NULL UNIQUE,
	"passenger_seats" integer NOT NULL,
	"photo_url" text,
	"status" "record_status" DEFAULT 'active'::"record_status" NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicles_seats_chk" CHECK ("passenger_seats" between 1 and 60)
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"mode" "financial_mode" NOT NULL,
	"type" "txn_type" NOT NULL,
	"direction" "txn_direction" NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" "txn_status" NOT NULL,
	"wallet_id" uuid,
	"booking_id" uuid,
	"payment_id" uuid,
	"refund_id" uuid,
	"payout_id" uuid,
	"user_id" uuid,
	"driver_id" uuid,
	"reverses" uuid,
	"reference_id" text,
	"description" text NOT NULL,
	"idempotency_key" text NOT NULL UNIQUE,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallet_txn_amount_chk" CHECK ("amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"driver_id" uuid NOT NULL,
	"mode" "financial_mode" NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" ("created_at");--> statement-breakpoint
CREATE INDEX "bookings_trip_idx" ON "bookings" ("trip_id");--> statement-breakpoint
CREATE INDEX "bookings_customer_idx" ON "bookings" ("customer_id");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" ("status");--> statement-breakpoint
CREATE INDEX "bookings_created_at_idx" ON "bookings" ("created_at");--> statement-breakpoint
CREATE INDEX "bookings_mode_idx" ON "bookings" ("mode");--> statement-breakpoint
CREATE INDEX "commissions_driver_idx" ON "commissions" ("driver_id");--> statement-breakpoint
CREATE INDEX "commissions_trip_idx" ON "commissions" ("trip_id");--> statement-breakpoint
CREATE INDEX "commissions_created_at_idx" ON "commissions" ("created_at");--> statement-breakpoint
CREATE INDEX "complaints_customer_idx" ON "complaints" ("customer_id");--> statement-breakpoint
CREATE INDEX "complaints_status_idx" ON "complaints" ("status");--> statement-breakpoint
CREATE INDEX "complaints_created_at_idx" ON "complaints" ("created_at");--> statement-breakpoint
CREATE INDEX "driver_documents_driver_idx" ON "driver_documents" ("driver_id");--> statement-breakpoint
CREATE INDEX "driver_profiles_verification_idx" ON "driver_profiles" ("verification");--> statement-breakpoint
CREATE INDEX "driver_profiles_created_at_idx" ON "driver_profiles" ("created_at");--> statement-breakpoint
CREATE INDEX "financial_settings_created_at_idx" ON "financial_settings" ("created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" ("created_at");--> statement-breakpoint
CREATE INDEX "payment_events_payment_idx" ON "payment_events" ("payment_id");--> statement-breakpoint
CREATE INDEX "payment_events_created_at_idx" ON "payment_events" ("created_at");--> statement-breakpoint
CREATE INDEX "payments_booking_idx" ON "payments" ("booking_id");--> statement-breakpoint
CREATE INDEX "payments_customer_idx" ON "payments" ("customer_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" ("status");--> statement-breakpoint
CREATE INDEX "payments_created_at_idx" ON "payments" ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_one_paid_per_booking_uq" ON "payments" ("booking_id") WHERE status in ('paid', 'refund_pending', 'partially_refunded', 'refunded');--> statement-breakpoint
CREATE INDEX "payouts_driver_idx" ON "payouts" ("driver_id");--> statement-breakpoint
CREATE INDEX "payouts_status_idx" ON "payouts" ("status");--> statement-breakpoint
CREATE INDEX "payouts_created_at_idx" ON "payouts" ("created_at");--> statement-breakpoint
CREATE INDEX "refunds_booking_idx" ON "refunds" ("booking_id");--> statement-breakpoint
CREATE INDEX "refunds_payment_idx" ON "refunds" ("payment_id");--> statement-breakpoint
CREATE INDEX "refunds_status_idx" ON "refunds" ("status");--> statement-breakpoint
CREATE INDEX "refunds_created_at_idx" ON "refunds" ("created_at");--> statement-breakpoint
CREATE INDEX "reviews_driver_idx" ON "reviews" ("driver_id");--> statement-breakpoint
CREATE INDEX "reviews_created_at_idx" ON "reviews" ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "route_stops_route_slug_uq" ON "route_stops" ("route_id","slug");--> statement-breakpoint
CREATE INDEX "route_stops_slug_idx" ON "route_stops" ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "trip_stops_trip_position_uq" ON "trip_stops" ("trip_id","position");--> statement-breakpoint
CREATE INDEX "trip_stops_trip_idx" ON "trip_stops" ("trip_id");--> statement-breakpoint
CREATE INDEX "trips_driver_idx" ON "trips" ("driver_id");--> statement-breakpoint
CREATE INDEX "trips_route_idx" ON "trips" ("route_id");--> statement-breakpoint
CREATE INDEX "trips_status_idx" ON "trips" ("status");--> statement-breakpoint
CREATE INDEX "trips_departs_at_idx" ON "trips" ("departs_at");--> statement-breakpoint
CREATE INDEX "trips_created_at_idx" ON "trips" ("created_at");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" ("role");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" ("status");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" ("created_at");--> statement-breakpoint
CREATE INDEX "vehicles_driver_idx" ON "vehicles" ("driver_id");--> statement-breakpoint
CREATE INDEX "wallet_txn_booking_idx" ON "wallet_transactions" ("booking_id");--> statement-breakpoint
CREATE INDEX "wallet_txn_driver_idx" ON "wallet_transactions" ("driver_id");--> statement-breakpoint
CREATE INDEX "wallet_txn_wallet_idx" ON "wallet_transactions" ("wallet_id");--> statement-breakpoint
CREATE INDEX "wallet_txn_user_idx" ON "wallet_transactions" ("user_id");--> statement-breakpoint
CREATE INDEX "wallet_txn_payment_idx" ON "wallet_transactions" ("payment_id");--> statement-breakpoint
CREATE INDEX "wallet_txn_type_idx" ON "wallet_transactions" ("type");--> statement-breakpoint
CREATE INDEX "wallet_txn_status_idx" ON "wallet_transactions" ("status");--> statement-breakpoint
CREATE INDEX "wallet_txn_created_at_idx" ON "wallet_transactions" ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "wallets_driver_mode_uq" ON "wallets" ("driver_id","mode");--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_trip_id_trips_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_users_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_pickup_stop_id_route_stops_id_fkey" FOREIGN KEY ("pickup_stop_id") REFERENCES "route_stops"("id");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_drop_stop_id_route_stops_id_fkey" FOREIGN KEY ("drop_stop_id") REFERENCES "route_stops"("id");--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_booking_id_bookings_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id");--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_payment_id_payments_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id");--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_trip_id_trips_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id");--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_driver_id_driver_profiles_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "driver_profiles"("id");--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_customer_id_users_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_settings_id_financial_settings_id_fkey" FOREIGN KEY ("settings_id") REFERENCES "financial_settings"("id");--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_booking_id_bookings_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id");--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_customer_id_users_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_driver_id_driver_profiles_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "driver_profiles"("id");--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_resolved_by_users_id_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "driver_documents" ADD CONSTRAINT "driver_documents_driver_id_driver_profiles_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "driver_profiles"("id");--> statement-breakpoint
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_verified_by_users_id_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "financial_settings" ADD CONSTRAINT "financial_settings_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_booking_id_bookings_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id");--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_payments_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_users_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_driver_id_driver_profiles_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "driver_profiles"("id");--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_wallet_id_wallets_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id");--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_decided_by_users_id_fkey" FOREIGN KEY ("decided_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_booking_id_bookings_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id");--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id");--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_customer_id_users_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_requested_by_users_id_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_decided_by_users_id_fkey" FOREIGN KEY ("decided_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_bookings_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id");--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_trip_id_trips_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id");--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_driver_id_driver_profiles_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "driver_profiles"("id");--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_users_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_route_id_routes_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id");--> statement-breakpoint
ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_trip_id_trips_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id");--> statement-breakpoint
ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_route_stop_id_route_stops_id_fkey" FOREIGN KEY ("route_stop_id") REFERENCES "route_stops"("id");--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_route_id_routes_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id");--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_driver_profiles_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "driver_profiles"("id");--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicle_id_vehicles_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id");--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_driver_id_driver_profiles_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "driver_profiles"("id");--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_wallets_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id");--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_booking_id_bookings_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id");--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_payment_id_payments_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id");--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_refund_id_refunds_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "refunds"("id");--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_payout_id_payouts_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "payouts"("id");--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_driver_id_driver_profiles_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "driver_profiles"("id");--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_driver_id_driver_profiles_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "driver_profiles"("id");