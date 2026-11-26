<?php
const DB_HOST = "127.0.0.1";
const DB_NAME = "densaulyq";
const DB_USER = "root";
const DB_PASS = "";
function getPDO(bool $withDb = true): PDO
{
    $dsn = "mysql:host=" . DB_HOST . ";charset=utf8mb4" . ($withDb ? ";dbname=" . DB_NAME : "");
    return new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
}

function connectDb(): array
{
    try {
        return [getPDO(), null];
    } catch (PDOException $e) {
        return [null, "Cannot connect to the database. Start MySQL and open setup.php first. (" . $e->getMessage() . ")"];
    }
}

function insertPatient(PDO $pdo, string $name, int $age, string $email, ?string $phone): int
{
    $stmt = $pdo->prepare("INSERT INTO patients (full_name, age, email, phone) VALUES (?, ?, ?, ?)");
    $stmt->execute([$name, $age, $email, $phone]);
    return (int)$pdo->lastInsertId();
}

function findPatientIdByEmail(PDO $pdo, string $email): ?int
{
    $stmt = $pdo->prepare("SELECT patient_id FROM patients WHERE email = ?");
    $stmt->execute([$email]);
    $id = $stmt->fetchColumn();
    return $id === false ? null : (int)$id;
}

function insertMeasurement(PDO $pdo, int $patientId, ?float $temp, int $hr, int $sys, int $dia, float $glucose, string $when): int
{
    $stmt = $pdo->prepare(
        "INSERT INTO measurements (patient_id, body_temperature, heart_rate, systolic, diastolic, blood_glucose, measured_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([$patientId, $temp, $hr, $sys, $dia, $glucose, $when]);
    return (int)$pdo->lastInsertId();
}
