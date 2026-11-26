<?php
require "functions.php";
require "db.php";

$patients = [];
$rows     = [];
$totalPatients = 0;
$totalMeasurements = 0;
$error = "";

$filterRaw = $_GET["patient_id"] ?? "";
$filter = is_string($filterRaw) ? (int)$filterRaw : 0;

[$pdo, $dbError] = connectDb();

if ($pdo) {
    try {
        $patients = $pdo->query(
            "SELECT p.patient_id, p.full_name, p.age, p.email, p.phone, COUNT(m.measurement_id) AS total
             FROM patients p
             LEFT JOIN measurements m ON m.patient_id = p.patient_id
             GROUP BY p.patient_id, p.full_name, p.age, p.email, p.phone
             ORDER BY p.patient_id"
        )->fetchAll();

        // ---------- JOIN: every measurement together with its patient ----------
        $sql = "SELECT m.measurement_id, p.full_name, p.age, p.email, p.phone,
                       m.body_temperature, m.heart_rate, m.systolic, m.diastolic,
                       m.blood_glucose, m.measured_at
                FROM measurements m
                INNER JOIN patients p ON p.patient_id = m.patient_id";
        $params = [];
        if ($filter > 0) {
            $sql .= " WHERE p.patient_id = ?";
            $params[] = $filter;
        }
        $sql .= " ORDER BY m.measured_at DESC, m.measurement_id DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        // plain counts, to check that the tables match the database
        $totalPatients     = (int)$pdo->query("SELECT COUNT(*) FROM patients")->fetchColumn();
        $totalMeasurements = (int)$pdo->query("SELECT COUNT(*) FROM measurements")->fetchColumn();
    } catch (PDOException $ex) {
        $error = "Database error: " . $ex->getMessage();
    }
}

$filterOptions = [];
foreach ($patients as $p) {
    $filterOptions[$p["patient_id"]] = "#" . $p["patient_id"] . " - " . $p["full_name"];
}

$pageTitle = "History";
$active    = "history";
require "header.php";
?>

    <?php if ($dbError): ?>
      <div class="msg msg-error"><?= e($dbError) ?></div>
    <?php endif; ?>
    <?php if ($error): ?>
      <div class="msg msg-error"><?= e($error) ?></div>
    <?php endif; ?>

    <section class="card-block">
      <h2>Patients</h2>
      <p class="count-line">Database: <?= $totalPatients ?> patients · <?= $totalMeasurements ?> measurements</p>

      <div class="table-scroll">
        <table class="sensor-table">
          <thead>
            <tr><th>ID</th><th>Full name</th><th>Age</th><th>Contact</th><th>Measurements</th></tr>
          </thead>
          <tbody>
            <?php foreach ($patients as $p): ?>
              <tr>
                <td><?= (int)$p["patient_id"] ?></td>
                <td><?= e($p["full_name"]) ?></td>
                <td><?= (int)$p["age"] ?></td>
                <td><?= e($p["email"]) ?><br><small><?= e($p["phone"] ?? "—") ?></small></td>
                <td><a href="history.php?patient_id=<?= (int)$p["patient_id"] ?>"><?= (int)$p["total"] ?> →</a></td>
              </tr>
            <?php endforeach; ?>
            <?php if (!$patients): ?>
              <tr><td colspan="5">No patients yet. <a href="add_patient.php">Add one</a> or run <a href="setup.php">setup</a>.</td></tr>
            <?php endif; ?>
          </tbody>
        </table>
      </div>
    </section>

    <section class="card-block">
      <h2>Measurement History</h2>
      <p class="section-lead">Each row joins a measurement with the patient who owns it.</p>

      <form class="filter-form" method="get" action="history.php">
        <div class="field">
          <label for="patient_id">Show patient</label>
          <?= renderSelect("patient_id", $filterOptions, (string)$filter) ?>
        </div>
        <button type="submit" class="btn btn-primary">Show</button>
        <a class="btn btn-secondary" href="history.php">All patients</a>
      </form>

      <div class="table-scroll">
        <table class="sensor-table">
          <thead>
            <tr>
              <th>#</th><th>Patient</th><th>Contact</th><th>Temp, °C</th><th>Heart rate</th>
              <th>Blood pressure</th><th>Glucose, mg/dL</th><th>Date / time</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($rows as $r): ?>
              <?php
                $bpCat = bpCategory((int)$r["systolic"], (int)$r["diastolic"]);
                $glCat = glucoseCategory((float)$r["blood_glucose"]);
                $hrCat = heartRateCategory((int)$r["heart_rate"]);
              ?>
              <tr>
                <td><?= (int)$r["measurement_id"] ?></td>
                <td><?= e($r["full_name"]) ?><br><small><?= (int)$r["age"] ?> years</small></td>
                <td><?= e($r["email"]) ?><br><small><?= e($r["phone"] ?? "—") ?></small></td>
                <td><?= $r["body_temperature"] === null ? "—" : number_format((float)$r["body_temperature"], 1) ?></td>
                <td><?= (int)$r["heart_rate"] ?> <span class="badge <?= categoryClass($hrCat) ?>"><?= e($hrCat) ?></span></td>
                <td><?= (int)$r["systolic"] ?>/<?= (int)$r["diastolic"] ?> <span class="badge <?= categoryClass($bpCat) ?>"><?= e($bpCat) ?></span></td>
                <td><?= number_format((float)$r["blood_glucose"], 1) ?> <span class="badge <?= categoryClass($glCat) ?>"><?= e($glCat) ?></span></td>
                <td><?= e(date("d.m.Y H:i", strtotime($r["measured_at"]))) ?></td>
              </tr>
            <?php endforeach; ?>
            <?php if (!$rows): ?>
              <tr><td colspan="8">No measurements found. <a href="add_measurement.php">Record one</a>.</td></tr>
            <?php endif; ?>
          </tbody>
        </table>
      </div>
      <p class="count-line">Showing <?= count($rows) ?> of <?= $totalMeasurements ?> measurements</p>
    </section>

<?php require "footer.php"; ?>
