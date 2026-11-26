
CREATE DATABASE IF NOT EXISTS densaulyq
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE densaulyq;

CREATE TABLE IF NOT EXISTS patients (
  patient_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name   VARCHAR(100) NOT NULL,
  age         TINYINT UNSIGNED NOT NULL,
  email       VARCHAR(100) NOT NULL UNIQUE,
  phone       VARCHAR(30) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS measurements (
  measurement_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_id        INT UNSIGNED NOT NULL,
  body_temperature  DECIMAL(4,1) NULL,
  heart_rate        SMALLINT UNSIGNED NOT NULL,
  systolic          SMALLINT UNSIGNED NOT NULL,
  diastolic         SMALLINT UNSIGNED NOT NULL,
  blood_glucose     DECIMAL(5,1) NOT NULL,
  measured_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_measurements_patient
    FOREIGN KEY (patient_id) REFERENCES patients (patient_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

