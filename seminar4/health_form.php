<?php
require "functions.php";
require "db.php";

$genders  = ["female" => "Female", "male" => "Male", "other" => "Other"];
$smoking  = ["never" => "Never smoked", "former" => "Former smoker", "current" => "Current smoker"];
$activity = [
    "sedentary" => "Sedentary (little or no exercise)",
    "light"     => "Light (1-2 times a week)",
    "moderate"  => "Moderate (3-4 times a week)",
    "active"    => "Active (5+ times a week)",
];
$diets  = ["healthy" => "Healthy", "average" => "Average", "unhealthy" => "Unhealthy (fast food, sweets, sugary drinks)"];
$stress = ["low" => "Low", "medium" => "Medium", "high" => "High"];
$factors = riskFactorLabels();

$errors  = [];
$notices = [];
$result  = null;

$in = array_fill_keys([
    "first_name", "last_name", "email", "age", "gender", "height", "weight",
    "systolic", "diastolic", "glucose", "heart_rate", "temperature",
    "activity", "diet", "smoking", "stress", "comments",
], "");
$in["factors"] = [];

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    foreach (array_keys($in) as $k) {
        if ($k !== "factors") {
            $in[$k] = is_string($_POST[$k] ?? null) ? trim($_POST[$k]) : "";
        }
    }
    $in["factors"] = is_array($_POST["factors"] ?? null) ? $_POST["factors"] : [];

    foreach (["first_name" => "First name", "last_name" => "Last name"] as $k => $label) {
        if ($in[$k] === "") {
            $errors[] = "$label is required.";
        } elseif (!preg_match('/^[\p{L} \'\-]{2,50}$/u', $in[$k])) {
            $errors[] = "$label must be 2-50 letters (no digits or symbols).";
        }
    }
    if ($in["email"] === "" || !filter_var($in["email"], FILTER_VALIDATE_EMAIL)) {
        $errors[] = "Enter a valid email address.";
    }

    $intRules = [
        "age"        => ["Age", 1, 120],
        "systolic"   => ["Systolic pressure", 60, 260],
        "diastolic"  => ["Diastolic pressure", 30, 160],
        "heart_rate" => ["Heart rate", 30, 220],
    ];
    foreach ($intRules as $k => [$label, $min, $max]) {
        if (!validInt($in[$k], $min, $max)) {
            $errors[] = "$label must be a whole number from $min to $max.";
        }
    }
    $floatRules = [
        "height"  => ["Height (cm)", 100, 250],
        "weight"  => ["Weight (kg)", 20, 300],
        "glucose" => ["Blood glucose (mg/dL)", 30, 600],
    ];
    foreach ($floatRules as $k => [$label, $min, $max]) {
        if (!validFloat($in[$k], $min, $max)) {
            $errors[] = "$label must be a number from $min to $max.";
        }
    }
    if (validInt($in["systolic"], 60, 260) && validInt($in["diastolic"], 30, 160)
        && (int)$in["diastolic"] >= (int)$in["systolic"]) {
        $errors[] = "Diastolic pressure must be lower than systolic pressure.";
    }
    if ($in["temperature"] !== "" && !validFloat($in["temperature"], 30, 45)) {
        $errors[] = "Body temperature (optional) must be from 30 to 45 °C.";
    }

    $choices = [
        "gender" => [$genders, "gender"], "activity" => [$activity, "physical activity"],
        "diet" => [$diets, "diet"], "smoking" => [$smoking, "smoking status"], "stress" => [$stress, "stress level"],
    ];
    foreach ($choices as $k => [$list, $label]) {
        if (!isset($list[$in[$k]])) {
            $errors[] = "Choose a value for $label.";
        }
    }
    foreach ($in["factors"] as $f) {
        if (!is_string($f) || !isset($factors[$f])) {
            $errors[] = "Invalid additional risk factor selected.";
            break;
        }
    }
    if (mb_strlen($in["comments"]) > 500) {
        $errors[] = "Comments must be 500 characters or fewer.";
    }

    // ---------- 3. process: BMI, analysis, risk ----------
    if (!$errors) {
        $age     = (int)$in["age"];
        $sys     = (int)$in["systolic"];
        $dia     = (int)$in["diastolic"];
        $hr      = (int)$in["heart_rate"];
        $glucose = (float)$in["glucose"];
        $temp    = $in["temperature"] === "" ? null : (float)$in["temperature"];

        $bmi    = calcBmi((float)$in["weight"], (float)$in["height"]);   // weight / height^2
        $bmiCat = bmiCategory($bmi);
        $bpCat  = bpCategory($sys, $dia);
        $glCat  = glucoseCategory($glucose);
        $hrCat  = heartRateCategory($hr);

        $risk = assessRisk([
            "age" => $age, "bmi_cat" => $bmiCat, "bp_cat" => $bpCat, "glucose_cat" => $glCat,
            "hr_cat" => $hrCat, "smoking" => $in["smoking"], "activity" => $in["activity"],
            "diet" => $in["diet"], "stress" => $in["stress"], "factors" => $in["factors"],
        ]);

        $fullName = $in["first_name"] . " " . $in["last_name"];
        $result = [
            "name" => $fullName, "bmi" => $bmi, "bmi_cat" => $bmiCat,
            "bp" => "$sys/$dia", "bp_cat" => $bpCat, "glucose" => $glucose, "gl_cat" => $glCat,
            "hr" => $hr, "hr_cat" => $hrCat, "risk" => $risk,
        ];

        $saved = saveToTextFile([
            "Date" => date("Y-m-d H:i:s"), "Name" => $fullName, "Email" => $in["email"],
            "Age" => $age, "Gender" => $in["gender"], "Height" => $in["height"] . " cm",
            "Weight" => $in["weight"] . " kg", "BMI" => "$bmi ($bmiCat)",
            "BP" => "$sys/$dia ($bpCat)", "Glucose" => "$glucose mg/dL ($glCat)",
            "Heart rate" => "$hr bpm ($hrCat)", "Temperature" => $temp === null ? "-" : "$temp C",
            "Activity" => $in["activity"], "Diet" => $in["diet"], "Smoking" => $in["smoking"],
            "Stress" => $in["stress"], "Factors" => implode(", ", $in["factors"]) ?: "none",
            "Risk" => $risk["level"] . " (" . $risk["points"] . " pts)", "Comments" => $in["comments"],
        ]);
        $notices[] = $saved
            ? ["ok", "Record saved to data/health_records.txt."]
            : ["error", "Could not write data/health_records.txt (check folder permissions)."];

        [$pdo, $dbError] = connectDb();
        if ($pdo) {
            try {
                $pid = findPatientIdByEmail($pdo, $in["email"])
                    ?? insertPatient($pdo, $fullName, $age, $in["email"], null);
                insertMeasurement($pdo, $pid, $temp, $hr, $sys, $dia, $glucose, date("Y-m-d H:i:s"));
                $notices[] = ["ok", "Measurement also saved to the database (patient ID $pid)."];
            } catch (PDOException $ex) {
                $notices[] = ["info", "Database save skipped: " . $ex->getMessage()];
            }
        } else {
            $notices[] = ["info", "Database not available, so the record was saved only to the text file. " . $dbError];
        }
    }
}

// last 5 lines of the text file (reading a file back)
$logFile = __DIR__ . "/data/health_records.txt";
$recent = is_file($logFile)
    ? array_slice(array_reverse(file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES)), 0, 5)
    : [];

$pageTitle = "Health form";
$active    = "health";
require "header.php";
?>

    <?php if ($result): ?>
    <section class="card-block">
      <h2>Assessment result</h2>
      <p class="section-lead">Patient: <strong><?= e($result["name"]) ?></strong></p>

      <?php foreach ($notices as [$type, $text]): ?>
        <div class="msg msg-<?= e($type) ?>"><?= e($text) ?></div>
      <?php endforeach; ?>

      <div class="metric-grid">
        <div class="metric-tile <?= str_replace("badge-", "tile-", categoryClass($result["bmi_cat"])) ?>">
          <span class="metric-icon" aria-hidden="true">⚖️</span>
          <p class="metric-label">BMI</p>
          <p class="metric-value"><?= $result["bmi"] ?><span class="metric-unit">kg/m²</span></p>
          <span class="badge <?= categoryClass($result["bmi_cat"]) ?>"><?= e($result["bmi_cat"]) ?></span>
        </div>
        <div class="metric-tile <?= str_replace("badge-", "tile-", categoryClass($result["bp_cat"])) ?>">
          <span class="metric-icon" aria-hidden="true">🩺</span>
          <p class="metric-label">Blood pressure</p>
          <p class="metric-value"><?= e($result["bp"]) ?><span class="metric-unit">mmHg</span></p>
          <span class="badge <?= categoryClass($result["bp_cat"]) ?>"><?= e($result["bp_cat"]) ?></span>
        </div>
        <div class="metric-tile <?= str_replace("badge-", "tile-", categoryClass($result["gl_cat"])) ?>">
          <span class="metric-icon" aria-hidden="true">💧</span>
          <p class="metric-label">Blood glucose</p>
          <p class="metric-value"><?= $result["glucose"] ?><span class="metric-unit">mg/dL</span></p>
          <span class="badge <?= categoryClass($result["gl_cat"]) ?>"><?= e($result["gl_cat"]) ?></span>
        </div>
        <div class="metric-tile <?= str_replace("badge-", "tile-", categoryClass($result["hr_cat"])) ?>">
          <span class="metric-icon" aria-hidden="true">❤️</span>
          <p class="metric-label">Heart rate</p>
          <p class="metric-value"><?= $result["hr"] ?><span class="metric-unit">bpm</span></p>
          <span class="badge <?= categoryClass($result["hr_cat"]) ?>"><?= e($result["hr_cat"]) ?></span>
        </div>
      </div>

      <div class="risk-banner risk-<?= strtolower($result["risk"]["level"]) ?>">
        <p class="risk-title">Overall risk: <?= e($result["risk"]["level"]) ?> (<?= $result["risk"]["points"] ?> points)</p>
        <?php if ($result["risk"]["reasons"]): ?>
          <ul>
            <?php foreach ($result["risk"]["reasons"] as $reason): ?>
              <li><?= e($reason) ?></li>
            <?php endforeach; ?>
          </ul>
        <?php else: ?>
          <p>No risk factors found.</p>
        <?php endif; ?>
      </div>
    </section>
    <?php endif; ?>

    <section class="card-block">
      <h2>Patient Health Monitoring Form</h2>
      <p class="section-lead">PHP validates the data, calculates BMI, analyses the vital signs, assesses the risk and saves the record to a text file and to the database.</p>

      <?php if ($errors): ?>
        <div class="msg msg-error">
          <strong>Nothing was saved. Please fix the following:</strong>
          <ul>
            <?php foreach ($errors as $err): ?>
              <li><?= e($err) ?></li>
            <?php endforeach; ?>
          </ul>
        </div>
      <?php endif; ?>

      <!-- novalidate: browser checks are off so the PHP validation is the one that runs -->
      <form class="app-form health-form" method="post" action="health_form.php" novalidate>

        <fieldset>
          <legend>Personal data</legend>
          <div class="form-grid">
            <div class="field">
              <label for="first_name">First name</label>
              <input type="text" id="first_name" name="first_name" value="<?= e($in["first_name"]) ?>" placeholder="Aruzhan">
            </div>
            <div class="field">
              <label for="last_name">Last name</label>
              <input type="text" id="last_name" name="last_name" value="<?= e($in["last_name"]) ?>" placeholder="Nurlanova">
            </div>
            <div class="field">
              <label for="email">Email</label>
              <input type="email" id="email" name="email" value="<?= e($in["email"]) ?>" placeholder="name@example.com">
            </div>
            <div class="field">
              <label for="age">Age</label>
              <input type="number" id="age" name="age" min="1" max="120" value="<?= e($in["age"]) ?>">
            </div>
            <div class="field">
              <span class="label-text">Gender</span>
              <?= renderRadios("gender", $genders, $in["gender"]) ?>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>Health indicators</legend>
          <div class="form-grid">
            <div class="field">
              <label for="height">Height (cm)</label>
              <input type="number" id="height" name="height" step="0.1" value="<?= e($in["height"]) ?>">
            </div>
            <div class="field">
              <label for="weight">Weight (kg)</label>
              <input type="number" id="weight" name="weight" step="0.1" value="<?= e($in["weight"]) ?>">
            </div>
            <div class="field">
              <label for="systolic">Blood pressure: systolic (mmHg)</label>
              <input type="number" id="systolic" name="systolic" value="<?= e($in["systolic"]) ?>" placeholder="120">
            </div>
            <div class="field">
              <label for="diastolic">Blood pressure: diastolic (mmHg)</label>
              <input type="number" id="diastolic" name="diastolic" value="<?= e($in["diastolic"]) ?>" placeholder="80">
            </div>
            <div class="field">
              <label for="glucose">Blood glucose (mg/dL)</label>
              <input type="number" id="glucose" name="glucose" step="0.1" value="<?= e($in["glucose"]) ?>">
            </div>
            <div class="field">
              <label for="heart_rate">Heart rate (bpm)</label>
              <input type="number" id="heart_rate" name="heart_rate" value="<?= e($in["heart_rate"]) ?>">
            </div>
            <div class="field">
              <label for="temperature">Body temperature, °C (optional)</label>
              <input type="number" id="temperature" name="temperature" step="0.1" value="<?= e($in["temperature"]) ?>">
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>Lifestyle</legend>
          <div class="form-grid">
            <div class="field">
              <label for="activity">Physical activity</label>
              <?= renderSelect("activity", $activity, $in["activity"]) ?>
            </div>
            <div class="field">
              <label for="diet">Diet</label>
              <?= renderSelect("diet", $diets, $in["diet"]) ?>
            </div>
            <div class="field">
              <label for="stress">Stress level</label>
              <?= renderSelect("stress", $stress, $in["stress"]) ?>
            </div>
            <div class="field">
              <span class="label-text">Smoking</span>
              <?= renderRadios("smoking", $smoking, $in["smoking"]) ?>
            </div>
            <div class="field field-wide">
              <span class="label-text">Additional risk factors</span>
              <?= renderChecks("factors", $factors, $in["factors"]) ?>
            </div>
            <div class="field field-wide">
              <label for="comments">Comments</label>
              <textarea id="comments" name="comments" rows="3" placeholder="Anything else the doctor should know"><?= e($in["comments"]) ?></textarea>
            </div>
          </div>
        </fieldset>

        <div class="actions">
          <button type="submit" class="btn btn-primary">Submit</button>
          <button type="reset" class="btn btn-secondary">Reset</button>
        </div>
      </form>
    </section>

    <?php if ($recent): ?>
    <section class="card-block">
      <h2>Last saved records (text file)</h2>
      <ul class="log-list">
        <?php foreach ($recent as $line): ?>
          <li><?= e($line) ?></li>
        <?php endforeach; ?>
      </ul>
    </section>
    <?php endif; ?>

<?php require "footer.php"; ?>
