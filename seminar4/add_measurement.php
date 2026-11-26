<?php
require "functions.php";
require "db.php";

$errors  = [];
$success = "";
$options = [];   

$pre = $_GET["patient_id"] ?? "";
$in = [
    "patient_id"  => is_string($pre) ? $pre : "",
    "temperature" => "", "heart_rate" => "", "systolic" => "", "diastolic" => "", "glucose" => "",
    "measured_at" => date("Y-m-d\TH:i"),
];

[$pdo, $dbError] = connectDb();

if ($pdo) {
    try {
        $patients = $pdo->query("SELECT patient_id, full_name FROM patients ORDER BY full_name")->fetchAll();
        foreach ($patients as $p) {
            $options[$p["patient_id"]] = "#" . $p["patient_id"] . " - " . $p["full_name"];
        }

        if ($_SERVER["REQUEST_METHOD"] === "POST") {
            foreach (array_keys($in) as $k) {
                $in[$k] = is_string($_POST[$k] ?? null) ? trim($_POST[$k]) : "";
            }

            
            if (!isset($options[$in["patient_id"]])) {
                $errors[] = "Choose a patient from the list.";
            }
            if (!validFloat($in["temperature"], 30, 45)) {
                $errors[] = "Body temperature must be a number from 30 to 45 °C.";
            }
            if (!validInt($in["heart_rate"], 30, 220)) {
                $errors[] = "Heart rate must be a whole number from 30 to 220 bpm.";
            }
            if (!validInt($in["systolic"], 60, 260)) {
                $errors[] = "Systolic pressure must be a whole number from 60 to 260.";
            }
            if (!validInt($in["diastolic"], 30, 160)) {
                $errors[] = "Diastolic pressure must be a whole number from 30 to 160.";
            }
            if (validInt($in["systolic"], 60, 260) && validInt($in["diastolic"], 30, 160)
                && (int)$in["diastolic"] >= (int)$in["systolic"]) {
                $errors[] = "Diastolic pressure must be lower than systolic pressure.";
            }
            if (!validFloat($in["glucose"], 30, 600)) {
                $errors[] = "Blood glucose must be a number from 30 to 600 mg/dL.";
            }
            $dt = DateTime::createFromFormat("Y-m-d\TH:i", $in["measured_at"]);
            if ($dt === false || $dt->format("Y-m-d\TH:i") !== $in["measured_at"]) {
                $errors[] = "Enter a valid date and time.";
            }

            if (!$errors) {
                $mid = insertMeasurement(
                    $pdo, (int)$in["patient_id"], (float)$in["temperature"], (int)$in["heart_rate"],
                    (int)$in["systolic"], (int)$in["diastolic"], (float)$in["glucose"],
                    $dt->format("Y-m-d H:i:s")
                );
                $success = "Measurement #$mid saved for " . $options[$in["patient_id"]] . ".";
                $keep = $in["patient_id"];
                $in = ["patient_id" => $keep, "temperature" => "", "heart_rate" => "", "systolic" => "",
                       "diastolic" => "", "glucose" => "", "measured_at" => date("Y-m-d\TH:i")];
            }
        }
    } catch (PDOException $ex) {
        $errors[] = "Database error: " . $ex->getMessage();
    }
}

$pageTitle = "Record measurement";
$active    = "measurement";
require "header.php";
?>

    <section class="card-block">
      <h2>Record a Measurement</h2>
      <p class="section-lead">Saves a new row in the <code>measurements</code> table, linked to a patient by <code>patient_id</code>.</p>

      <?php if ($dbError): ?>
        <div class="msg msg-error"><?= e($dbError) ?></div>
      <?php elseif (!$options): ?>
        <div class="msg msg-info">There are no patients yet. <a href="add_patient.php">Add a patient first →</a></div>
      <?php endif; ?>
      <?php if ($success): ?>
        <div class="msg msg-ok"><?= e($success) ?> <a href="history.php">View history →</a></div>
      <?php endif; ?>
      <?php if ($errors): ?>
        <div class="msg msg-error">
          <strong>Nothing was saved:</strong>
          <ul>
            <?php foreach ($errors as $err): ?>
              <li><?= e($err) ?></li>
            <?php endforeach; ?>
          </ul>
        </div>
      <?php endif; ?>

      <?php if ($options): ?>
      <form class="app-form" method="post" action="add_measurement.php">
        <div class="form-grid">
          <div class="field field-wide">
            <label for="patient_id">Patient</label>
            <?= renderSelect("patient_id", $options, $in["patient_id"]) ?>
          </div>
          <div class="field">
            <label for="temperature">Body temperature (°C)</label>
            <input type="number" id="temperature" name="temperature" step="0.1" value="<?= e($in["temperature"]) ?>">
          </div>
          <div class="field">
            <label for="heart_rate">Heart rate (bpm)</label>
            <input type="number" id="heart_rate" name="heart_rate" value="<?= e($in["heart_rate"]) ?>">
          </div>
          <div class="field">
            <label for="systolic">Blood pressure: systolic (mmHg)</label>
            <input type="number" id="systolic" name="systolic" value="<?= e($in["systolic"]) ?>">
          </div>
          <div class="field">
            <label for="diastolic">Blood pressure: diastolic (mmHg)</label>
            <input type="number" id="diastolic" name="diastolic" value="<?= e($in["diastolic"]) ?>">
          </div>
          <div class="field">
            <label for="glucose">Blood glucose (mg/dL)</label>
            <input type="number" id="glucose" name="glucose" step="0.1" value="<?= e($in["glucose"]) ?>">
          </div>
          <div class="field">
            <label for="measured_at">Date and time</label>
            <input type="datetime-local" id="measured_at" name="measured_at" value="<?= e($in["measured_at"]) ?>">
          </div>
        </div>
        <div class="actions">
          <button type="submit" class="btn btn-primary">Save measurement</button>
          <button type="reset" class="btn btn-secondary">Reset</button>
        </div>
      </form>
      <?php endif; ?>
    </section>

<?php require "footer.php"; ?>
