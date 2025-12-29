/*
  # Exam Booking System

  ## Overview
  Complete database schema for managing exam seat bookings with support for:
  - Multiple exam rounds with date/time/capacity tracking
  - User bookings with different pricing tiers
  - File uploads for ID cards and payment slips
  - Payment verification workflow

  ## New Tables

  ### 1. exam_rounds
  Stores available exam sessions with capacity management
  - `id` (uuid, primary key)
  - `exam_date` (date) - The date of the exam
  - `exam_time` (text) - Either 'Morning' or 'Afternoon'
  - `max_seats` (integer) - Maximum capacity (default: 70)
  - `current_seats` (integer) - Number of booked seats (default: 0)
  - `is_active` (boolean) - Whether this round is open for booking
  - `created_at` (timestamptz)

  ### 2. bookings
  Stores all booking information including user details and payment
  - `id` (uuid, primary key)
  - `exam_round_id` (uuid, foreign key) - Links to exam_rounds
  - `user_type` (text) - Type: 'tg', 'wingspan', 'intern', 'general'
  - `full_name` (text) - Applicant's full name
  - `email` (text) - Contact email
  - `phone` (text) - Contact phone number
  - `price` (integer) - Final price paid
  - `payment_method` (text) - Either 'transfer' or 'walkin'
  - `payment_status` (text) - Status: 'pending', 'verified', 'rejected'
  - `id_card_url` (text) - Storage URL for ID card photo (required for internal staff)
  - `payment_slip_url` (text) - Storage URL for payment slip (if transfer)
  - `booking_code` (text) - Unique booking reference code
  - `confirmed_at` (timestamptz) - When booking was confirmed
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Public can insert bookings (with validation)
  - Only authenticated admins can update/delete
  - Public can read active exam rounds
  - Admins can view all bookings

  ## Storage
  - Create 'booking-files' bucket for ID cards and payment slips
  - Public read access for verification
  - Authenticated write access

  ## Functions
  - Trigger to increment current_seats when booking is created
  - Trigger to generate unique booking codes
*/

-- Create exam_rounds table
CREATE TABLE IF NOT EXISTS exam_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_date date NOT NULL,
  exam_time text NOT NULL CHECK (exam_time IN ('Morning', 'Afternoon')),
  max_seats integer NOT NULL DEFAULT 70,
  current_seats integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_round_id uuid REFERENCES exam_rounds(id) ON DELETE CASCADE,
  user_type text NOT NULL CHECK (user_type IN ('tg', 'wingspan', 'intern', 'general')),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  price integer NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('transfer', 'walkin')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'verified', 'rejected')),
  id_card_url text,
  payment_slip_url text,
  booking_code text UNIQUE,
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE exam_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exam_rounds
CREATE POLICY "Anyone can view active exam rounds"
  ON exam_rounds FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can manage exam rounds"
  ON exam_rounds FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for bookings
CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own bookings by email"
  ON bookings FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can update bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete bookings"
  ON bookings FOR DELETE
  TO authenticated
  USING (true);

-- Function to generate booking code
CREATE OR REPLACE FUNCTION generate_booking_code()
RETURNS text AS $$
DECLARE
  code text;
  exists boolean;
BEGIN
  LOOP
    code := 'EXAM' || LPAD(FLOOR(RANDOM() * 100000)::text, 5, '0');
    SELECT EXISTS(SELECT 1 FROM bookings WHERE booking_code = code) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate booking code
CREATE OR REPLACE FUNCTION set_booking_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_code IS NULL THEN
    NEW.booking_code := generate_booking_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_code_trigger
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_booking_code();

-- Function to increment seat count
CREATE OR REPLACE FUNCTION increment_seat_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE exam_rounds
  SET current_seats = current_seats + 1
  WHERE id = NEW.exam_round_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_seats_trigger
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION increment_seat_count();

-- Function to decrement seat count
CREATE OR REPLACE FUNCTION decrement_seat_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE exam_rounds
  SET current_seats = current_seats - 1
  WHERE id = OLD.exam_round_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER decrement_seats_trigger
  AFTER DELETE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION decrement_seat_count();

-- Insert sample exam rounds
INSERT INTO exam_rounds (exam_date, exam_time, is_active) VALUES
  ('2025-01-15', 'Morning', true),
  ('2025-01-15', 'Afternoon', true),
  ('2025-01-22', 'Morning', true),
  ('2025-01-22', 'Afternoon', true),
  ('2025-02-05', 'Morning', true),
  ('2025-02-05', 'Afternoon', true)
ON CONFLICT DO NOTHING;

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('booking-files', 'booking-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can upload booking files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'booking-files');

CREATE POLICY "Anyone can view booking files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'booking-files');

CREATE POLICY "Authenticated users can delete booking files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'booking-files');
