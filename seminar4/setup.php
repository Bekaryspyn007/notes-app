<?php
require "functions.php";
require "db.php";

$log   = [];
$error = "";

try {
    $pdo = getPDO(false);

    $pdo->exec("CREATE DATABASE IF NOT EXISTS " . DB_NAME . " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $log[] = "Database '" . DB_NAME . "' is ready.";
    $pdo->exec("USE " . DB_NAME);

    $pdo->exec("CREATE TABLE IF NOT EXISTS patients (
        patient_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        full_name   VARCHAR(100) NOT NULL,
        age         TINYINT UNSIGNED NOT NULL,
        email       VARCHAR(100) NOT NULL UNIQUE,
        phone       VARCHAR(30) NULL,
        created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB");
    $log[] = "Table 'patients' is ready (primary key: patient_id).";

    $pdo->exec("CREATE TABLE IF NOT EXISTS measurements (
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
    ) ENGINE=InnoDB");
    $log[] = "Table 'measurements' is ready (foreign key: patient_id → patients.patient_id).";

    if (isset($_GET["seed"])) {
        $count = (int)$pdo->query("SELECT COUNT(*) FROM patients")->fetchColumn();
        if ($count > 0) {
            $log[] = "Sample data skipped: the patients table is not empty.";
        } else {
            $people = [
                ["Aruzhan Nurlanova", 45, "aruzhan@example.com", "+7 701 111 22 33"],
                ["Dias Serikov",      52, "dias@example.com",    "+7 702 222 33 44"],
                ["Madina Omarova",    39, "madina@example.com",  "+7 705 333 44 55"],
            ];
            $ids = [];
            foreach ($people as [$name, $age, $email, $phone]) {
                $ids[] = insertPatient($pdo, $name, $age, $email, $phone);
            }
            $data = [
                [0, 36.8, 82, 118, 76, 96.0,  "-3 days"],
                [0, 37.2, 88, 126, 82, 104.0, "-1 day"],
                [1, 38.1, 96, 138, 88, 132.0, "-2 days"],
                [1, 37.6, 91, 132, 85, 118.0, "-1 day"],
                [2, 36.7, 74, 112, 72, 92.0,  "-2 days"],
                [2, 36.5, 68, 108, 70, 88.0,  "-2 hours"],
            ];
            foreach ($data as [$i, $t, $hr, $sys, $dia, $g, $when]) {
                insertMeasurement($pdo, $ids[$i], $t, $hr, $sys, $dia, $g, date("Y-m-d H:i:s", strtotime($when)));
            }
            $log[] = "Sample data added: 3 patients and 6 measurements.";
        }
    }
} catch (PDOException $ex) {
    $error = $ex->getMessage();
}

$pageTitle = "Database setup";
$active    = "setup";
require "header.php";
?>

    <section class="card-block">
      <h2>Database Setup</h2>
      <p class="section-lead">Creates the MySQL database <code><?= e(DB_NAME) ?></code> with the tables <code>patients</code> and <code>measurements</code>. Safe to open more than once.</p>

      <?php if ($error): ?>
        <div class="msg msg-error">
          <strong>Could not connect or create the database.</strong><br>
          <?= e($error) ?><br>
          Check that MySQL is running and that the user/password in <code>db.php</code> are correct.
        </div>
      <?php else: ?>
        <div class="msg msg-ok">
          <ul>
            <?php foreach ($log as $line): ?>
              <li><?= e($line) ?></li>
            <?php endforeach; ?>
          </ul>
        </div>
        <p>
          <a class="btn btn-primary" href="setup.php?seed=1">Add sample data (3 patients, 6 measurements)</a>
          <a class="btn btn-secondary" href="history.php">Open history</a>
        </p>
      <?php endif; ?>
    </section>

<?php require "footer.php"; ?>
