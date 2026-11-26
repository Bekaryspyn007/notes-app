<?php

declare(strict_types=1);
session_start();
date_default_timezone_set('Asia/Almaty');

const DATA_FILE = __DIR__ . '/patients.txt';

$GENDERS  = ["Male", "Female", "Other"];
$ACTIVITY = [
    "sedentary" => "Sedentary (little or no exercise)",
    "light"     => "Light (1–2 workouts per week)",
    "moderate"  => "Moderate (3–4 workouts per week)",
    "active"    => "Active (5+ workouts per week)",
];
$DIET = [
    "poor"    => "Poor — fast food, sugary drinks, few vegetables",
    "average" => "Average — mixed diet",
    "good"    => "Good — mostly whole foods and vegetables",
];
$SMOKING = [
    "never"   => "Never smoked",
    "former"  => "Former smoker",
    "current" => "Current smoker",
];
$STRESS = [
    "low"      => "Low",
    "moderate" => "Moderate",
    "high"     => "High",
];
$RISKS = [
    "family_diabetes" => "Family history of type 2 diabetes",
    "family_heart"    => "Family history of heart disease",
    "abdominal_fat"   => "Excess abdominal fat (large waist)",
    "cholesterol"     => "High cholesterol / triglycerides",
    "alcohol"         => "Frequent alcohol consumption",
    "poor_sleep"      => "Poor sleep (under 6 hours)",
    "sedentary_job"   => "Sedentary job (sitting most of the day)",
];

function e(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES, "UTF-8");
}

function post(string $key): string
{
    $v = $_POST[$key] ?? "";
    return is_string($v) ? trim($v) : "";
}

function parseNumber(string $raw, float $min, float $max, bool $integer = false): ?float
{
    $raw = str_replace(",", ".", $raw);
    if ($raw === "" || !is_numeric($raw)) {
        return null;
    }
    $n = (float)$raw;
    if ($integer && floor($n) !== $n) {
        return null;
    }
    if ($n < $min || $n > $max) {
        return null;
    }
    return $n;
}

function oneLine(string $s): string
{
    return trim(preg_replace('/\s+/u', " ", $s) ?? "");
}


function classifyBmi(float $bmi): string
{
    if ($bmi < 18.5) {
        return "Underweight";
    } elseif ($bmi < 25) {
        return "Normal";
    } elseif ($bmi < 30) {
        return "Overweight";
    } else {
        return "Obesity";
    }
}

function classifyBp(int $sys, int $dia): string
{
    if ($sys < 90 || $dia < 60) {
        return "Low";
    } elseif ($sys >= 140 || $dia >= 90) {
        return "High";
    } elseif ($sys >= 120 || $dia >= 80) {
        return "Elevated";
    } else {
        return "Normal";
    }
}

function classifyGlucose(float $g): string
{
    if ($g < 70) {
        return "Low";
    } elseif ($g < 100) {
        return "Normal";
    } elseif ($g < 126) {
        return "Elevated";
    } else {
        return "High";
    }
}

function classifyHeartRate(int $hr): string
{
    if ($hr < 60) {
        return "Low";
    } elseif ($hr <= 100) {
        return "Normal";
    } else {
        return "High";
    }
}


function bmiPoints(string $c): int
{
    if ($c === "Normal") {
        return 0;
    } elseif ($c === "Obesity") {
        return 2;
    } else {
        return 1;
    }
}

function levelPoints(string $c): int
{
    if ($c === "Normal") {
        return 0;
    } elseif ($c === "High") {
        return 2;
    } else {
        return 1; 
    }
}

function heartPoints(string $c): int
{
    return $c === "Normal" ? 0 : 1;
}

function riskLevel(int $score): string
{
    if ($score <= 2) {
        return "Low Risk";
    } elseif ($score <= 5) {
        return "Moderate Risk";
    } else {
        return "High Risk";
    }
}

function statusClass(string $label): string
{
    if ($label === "Normal") {
        return "ok";
    } elseif ($label === "High" || $label === "Obesity") {
        return "bad";
    }
    return "warn";
}

function healthScore(array $d): array
{
    $p = [];

    $p["BMI"] = match ($d["bmiCat"]) {
        "Overweight", "Underweight" => 8,
        "Obesity"                   => 15,
        default                     => 0,
    };
    $p["Blood pressure"] = match ($d["bpStatus"]) {
        "Low", "Elevated" => 8,
        "High"            => 18,
        default           => 0,
    };
    $p["Blood glucose"] = match ($d["glucoseStatus"]) {
        "Low", "Elevated" => 10,
        "High"            => 20,
        default           => 0,
    };
    $p["Heart rate"] = $d["hrStatus"] === "Normal" ? 0 : 5;

    $p["Physical activity"] = match ($d["activity"]) {
        "sedentary" => 8,
        "light"     => 4,
        default     => 0,
    };
    $p["Diet"] = match ($d["diet"]) {
        "poor"    => 8,
        "average" => 3,
        default   => 0,
    };
    $p["Smoking"] = match ($d["smoking"]) {
        "current" => 10,
        "former"  => 3,
        default   => 0,
    };
    $p["Stress"] = match ($d["stress"]) {
        "high"     => 6,
        "moderate" => 3,
        default    => 0,
    };
    $p["Lifestyle risk factors"] = 3 * $d["riskCount"];

    $score = max(0, 100 - array_sum($p));
    return [$score, $p];
}

function mainRisk(array $penalties): ?string
{
    arsort($penalties);
    $key = array_key_first($penalties);
    return ($key !== null && $penalties[$key] > 0) ? $key : null;
}

function dailyFocus(?string $main): string
{
    return match ($main) {
        "BMI"                    => "Take a 20-minute brisk walk and swap one sugary drink for water.",
        "Blood pressure"         => "Keep salt low today: skip processed snacks and sit calmly for 5 minutes before measuring your pressure.",
        "Blood glucose"          => "Walk for 10–15 minutes after your biggest meal and avoid sweet drinks.",
        "Heart rate"             => "Drink enough water, limit caffeine and do 5 minutes of slow breathing.",
        "Physical activity"      => "Add 15 minutes of movement — stairs, a walk or light stretching.",
        "Diet"                   => "Add one extra serving of vegetables to lunch or dinner.",
        "Smoking"                => "Delay your next cigarette by 15 minutes and drink a glass of water instead.",
        "Stress"                 => "Take 10 quiet minutes today: slow breathing or a walk without your phone.",
        "Lifestyle risk factors" => "Pick one risk factor from your list and write down one small step to improve it this week.",
        default                  => "Great work! Keep your routine: drink water, move a little and sleep well.",
    };
}


function buildRecommendations(array $d): array
{
    $r = [];

    // BMI
    if ($d["bmiCat"] === "Underweight") {
        $r[] = "Your BMI is below 18.5. Talk to a doctor or dietitian about a balanced plan to reach a healthy weight.";
    } elseif ($d["bmiCat"] === "Normal") {
        $r[] = "Your BMI is in the normal range — keep your current balance of food and activity.";
    } elseif ($d["bmiCat"] === "Overweight") {
        $r[] = "Your BMI is in the overweight range. Losing even 5–7% of body weight can noticeably improve pressure and glucose.";
    } else {
        $r[] = "Your BMI is in the obesity range. Please discuss a structured weight-management plan with your physician.";
    }

    // Blood pressure
    if ($d["bpStatus"] === "Low") {
        $r[] = "Blood pressure is low. Stay hydrated, stand up slowly and see a doctor if you feel dizzy or faint.";
    } elseif ($d["bpStatus"] === "Normal") {
        $r[] = "Blood pressure is normal. Keep checking it regularly.";
    } elseif ($d["bpStatus"] === "Elevated") {
        $r[] = "Blood pressure is elevated. Reduce salt, limit alcohol and re-measure it on several different days.";
    } else {
        $r[] = "Blood pressure is high. Book a doctor's appointment soon and measure it daily at the same time.";
    }

    // Glucose
    if ($d["glucoseStatus"] === "Low") {
        $r[] = "Glucose is low. Do not skip meals and consult a doctor, especially if you have shakiness or sweating.";
    } elseif ($d["glucoseStatus"] === "Normal") {
        $r[] = "Glucose is normal. Continue limiting sugary drinks and refined carbohydrates.";
    } elseif ($d["glucoseStatus"] === "Elevated") {
        $r[] = "Glucose is elevated (pre-diabetes range). Cut sugary drinks, add fibre and repeat a fasting test within a few weeks.";
    } else {
        $r[] = "Glucose is high. See a doctor promptly for confirmation tests and follow-up.";
    }

    // Heart rate
    if ($d["hrStatus"] === "Low") {
        $r[] = "Resting heart rate is below 60 bpm. This can be normal for athletes, but tell your doctor if you feel weak or dizzy.";
    } elseif ($d["hrStatus"] === "High") {
        $r[] = "Resting heart rate is above 100 bpm. Reduce caffeine, manage stress and mention it to your doctor if it stays high.";
    }

    // Lifestyle answers
    if ($d["activity"] === "sedentary") {
        $r[] = "Aim for at least 150 minutes of moderate activity per week; start with 10-minute walks after meals.";
    } elseif ($d["activity"] === "light") {
        $r[] = "Gradually increase your activity towards 150 minutes per week.";
    }
    if ($d["diet"] === "poor") {
        $r[] = "Improve your diet step by step: more vegetables and whole grains, fewer fast-food meals and sweet drinks.";
    } elseif ($d["diet"] === "average") {
        $r[] = "Your diet is average — replacing one processed meal a day with a whole-food meal would help.";
    }
    if ($d["smoking"] === "current") {
        $r[] = "Smoking greatly raises heart-disease risk. Ask your doctor about quit-smoking support.";
    } elseif ($d["smoking"] === "former") {
        $r[] = "Well done for quitting smoking — stay smoke-free.";
    }
    if ($d["stress"] === "high") {
        $r[] = "Your stress level is high. Try regular breathing exercises, enough sleep and short breaks during the day.";
    } elseif ($d["stress"] === "moderate") {
        $r[] = "Moderate stress is common — keep a regular sleep schedule and make time for relaxation.";
    }

    // Checked risk factors
    if (in_array("family_diabetes", $d["riskKeys"], true) || in_array("family_heart", $d["riskKeys"], true)) {
        $r[] = "Because of your family history, have your glucose, cholesterol and blood pressure checked at least once a year.";
    }
    if (in_array("alcohol", $d["riskKeys"], true)) {
        $r[] = "Try to reduce alcohol; it raises blood pressure and adds extra calories.";
    }
    if (in_array("poor_sleep", $d["riskKeys"], true)) {
        $r[] = "Aim for 7–8 hours of sleep; poor sleep is linked to higher glucose and weight gain.";
    }
    if (in_array("abdominal_fat", $d["riskKeys"], true) || in_array("cholesterol", $d["riskKeys"], true)) {
        $r[] = "Ask your doctor for a lipid profile and waist-circumference check.";
    }

    // Overall level
    if ($d["riskLevel"] === "High Risk") {
        $r[] = "Overall risk is HIGH: please arrange a medical consultation soon rather than waiting for symptoms.";
    } elseif ($d["riskLevel"] === "Moderate Risk") {
        $r[] = "Overall risk is moderate: make a few lifestyle changes now and re-check your numbers in 1–3 months.";
    } else {
        $r[] = "Overall risk is low: keep your healthy habits and repeat this check regularly.";
    }

    return $r;
}


function buildSummary(array $d): string
{
    $text = sprintf(
        "%s (%d, %s) has a BMI of %.1f (%s), blood pressure %d/%d mmHg (%s), fasting glucose %s mg/dL (%s) and a heart rate of %d bpm (%s). ",
        $d["fullName"], $d["age"], strtolower($d["gender"]),
        $d["bmi"], strtolower($d["bmiCat"]),
        $d["sys"], $d["dia"], strtolower($d["bpStatus"]),
        rtrim(rtrim(number_format($d["glucose"], 1, ".", ""), "0"), "."), strtolower($d["glucoseStatus"]),
        $d["hr"], strtolower($d["hrStatus"])
    );
    $text .= sprintf(
        "%d lifestyle risk factor%s selected. Health Risk Score: %d → %s. Overall Health Score: %d/100",
        $d["riskCount"], $d["riskCount"] === 1 ? " was" : "s were", $d["riskScore"], $d["riskLevel"], $d["healthScore"]
    );
    $text .= $d["mainRisk"] !== null
        ? "; the biggest area to work on is: " . strtolower($d["mainRisk"]) . "."
        : "; no major problem areas were found.";
    return $text;
}

function saveRecord(array $d): int
{
    $fh = fopen(DATA_FILE, "a+");          
    if ($fh === false) {
        return 0;
    }
    $recordNo = 0;
    if (flock($fh, LOCK_EX)) {
        rewind($fh);
        $existing = (string)stream_get_contents($fh);
        $recordNo = preg_match_all('/^=+ RECORD #/m', $existing) + 1;

        $L = [];
        $L[] = "==================== RECORD #{$recordNo} ====================";
        $L[] = "Date and time: " . $d["savedAt"];
        $L[] = "";
        $L[] = "[PATIENT]";
        $L[] = "Name: " . $d["fullName"];
        $L[] = "Email: " . $d["email"];
        $L[] = "Age: " . $d["age"];
        $L[] = "Gender: " . $d["gender"];
        $L[] = "";
        $L[] = "[HEALTH PARAMETERS]";
        $L[] = "Height: " . $d["height"] . " cm";
        $L[] = "Weight: " . $d["weight"] . " kg";
        $L[] = "Blood pressure: " . $d["sys"] . "/" . $d["dia"] . " mmHg";
        $L[] = "Blood glucose: " . $d["glucose"] . " mg/dL";
        $L[] = "Heart rate: " . $d["hr"] . " bpm";
        $L[] = "Physical activity: " . $d["activityLabel"];
        $L[] = "Diet: " . $d["dietLabel"];
        $L[] = "Smoking: " . $d["smokingLabel"];
        $L[] = "Stress level: " . $d["stressLabel"];
        $L[] = "";
        $L[] = "[RESULTS]";
        $L[] = "BMI: " . number_format($d["bmi"], 1) . " (" . $d["bmiCat"] . ")";
        $L[] = "Blood pressure status: " . $d["bpStatus"];
        $L[] = "Glucose status: " . $d["glucoseStatus"];
        $L[] = "Heart rate status: " . $d["hrStatus"];
        $L[] = "Risk factors (" . $d["riskCount"] . "): " . ($d["riskCount"] > 0 ? implode("; ", $d["riskLabels"]) : "none");
        $L[] = "Health Risk Score: " . $d["riskScore"];
        $L[] = "Risk Level: " . $d["riskLevel"];
        $L[] = "Health Score: " . $d["healthScore"] . "/100";
        $L[] = "Most significant risk: " . ($d["mainRisk"] ?? "none");
        $L[] = "";
        $L[] = "[RECOMMENDATIONS]";
        foreach ($d["recommendations"] as $i => $rec) {
            $L[] = ($i + 1) . ". " . $rec;
        }
        $L[] = "";
        $L[] = "[COMMENTS]";
        $L[] = $d["comments"] !== "" ? $d["comments"] : "-";
        $L[] = "";
        $L[] = "";

        $ok = fwrite($fh, implode(PHP_EOL, $L)) !== false;
        fflush($fh);
        flock($fh, LOCK_UN);
        if (!$ok) {
            $recordNo = 0;
        }
    }
    fclose($fh);
    return $recordNo;
}

if (empty($_SESSION["token"])) {
    $_SESSION["token"] = bin2hex(random_bytes(16));
}

$errors    = [];     
$old       = [];     
$oldRisks  = [];
$result    = null;   
$saveError = false;

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $old      = $_POST;
    $oldRisks = (isset($_POST["risk_factors"]) && is_array($_POST["risk_factors"])) ? $_POST["risk_factors"] : [];

    if (!hash_equals($_SESSION["token"], post("token"))) {
        $errors["form"] = "This form was already submitted or has expired. Please fill it in again.";
    }

    $firstName = oneLine(post("first_name"));
    $lastName  = oneLine(post("last_name"));
    $namePattern = "/^\p{L}[\p{L}'\- ]*$/u";
    if ($firstName === "") {
        $errors["first_name"] = "First name is required.";
    } elseif (mb_strlen($firstName) < 2 || mb_strlen($firstName) > 40 || !preg_match($namePattern, $firstName)) {
        $errors["first_name"] = "Use 2–40 letters only (spaces, ' and - are allowed).";
    }
    if ($lastName === "") {
        $errors["last_name"] = "Last name is required.";
    } elseif (mb_strlen($lastName) < 2 || mb_strlen($lastName) > 40 || !preg_match($namePattern, $lastName)) {
        $errors["last_name"] = "Use 2–40 letters only (spaces, ' and - are allowed).";
    }

    $email = strtolower(post("email"));
    if ($email === "") {
        $errors["email"] = "Email is required.";
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 100) {
        $errors["email"] = "Enter a valid email address, e.g. name@example.com.";
    }

    // --- numbers
    $age = parseNumber(post("age"), 18, 120, true);
    if ($age === null) {
        $errors["age"] = "Enter a whole number of years from 18 to 120.";
    }
    $height = parseNumber(post("height"), 100, 250);
    if ($height === null) {
        $errors["height"] = "Enter your height in cm (100–250).";
    }
    $weight = parseNumber(post("weight"), 30, 300);
    if ($weight === null) {
        $errors["weight"] = "Enter your weight in kg (30–300).";
    }
    $sys = parseNumber(post("systolic"), 70, 250, true);
    if ($sys === null) {
        $errors["systolic"] = "Systolic pressure: whole number 70–250.";
    }
    $dia = parseNumber(post("diastolic"), 40, 150, true);
    if ($dia === null) {
        $errors["diastolic"] = "Diastolic pressure: whole number 40–150.";
    }
    if ($sys !== null && $dia !== null && $sys <= $dia) {
        $errors["systolic"] = "Systolic (top) pressure must be higher than diastolic (bottom).";
    }
    $glucose = parseNumber(post("glucose"), 30, 600);
    if ($glucose === null) {
        $errors["glucose"] = "Enter fasting glucose in mg/dL (30–600).";
    }
    $hr = parseNumber(post("heart_rate"), 30, 220, true);
    if ($hr === null) {
        $errors["heart_rate"] = "Heart rate: whole number 30–220 bpm.";
    }

    // --- choices (whitelisted)
    $gender = post("gender");
    if (!in_array($gender, $GENDERS, true)) {
        $errors["gender"] = "Please choose a gender.";
    }
    $activity = post("activity");
    if (!array_key_exists($activity, $ACTIVITY)) {
        $errors["activity"] = "Please choose your physical activity.";
    }
    $diet = post("diet");
    if (!array_key_exists($diet, $DIET)) {
        $errors["diet"] = "Please choose your diet.";
    }
    $smoking = post("smoking");
    if (!array_key_exists($smoking, $SMOKING)) {
        $errors["smoking"] = "Please choose your smoking status.";
    }
    $stress = post("stress");
    if (!array_key_exists($stress, $STRESS)) {
        $errors["stress"] = "Please choose your stress level.";
    }

    // --- checkboxes: array processed with foreach
    $riskKeys   = [];
    $riskLabels = [];
    $riskCount  = 0;
    foreach ($oldRisks as $value) {
        if (is_string($value) && array_key_exists($value, $RISKS) && !in_array($value, $riskKeys, true)) {
            $riskKeys[]   = $value;
            $riskLabels[] = $RISKS[$value];
            $riskCount++;
        }
    }

    $comments = oneLine(post("comments"));
    if (mb_strlen($comments) > 500) {
        $errors["comments"] = "Comments must be 500 characters or fewer.";
    }

    if (count($errors) === 0) {
        $heightM = $height / 100;
        $bmi     = $weight / ($heightM * $heightM);           // BMI = weight / height²
        $sys = (int)$sys;
        $dia = (int)$dia;
        $hr  = (int)$hr;

        $d = [
            "fullName" => mb_convert_case($firstName, MB_CASE_TITLE, "UTF-8") . " " . mb_convert_case($lastName, MB_CASE_TITLE, "UTF-8"),
            "email"    => $email,
            "age"      => (int)$age,
            "gender"   => $gender,
            "height"   => $height,
            "weight"   => $weight,
            "sys"      => $sys,
            "dia"      => $dia,
            "glucose"  => $glucose,
            "hr"       => $hr,
            "activity" => $activity, "activityLabel" => $ACTIVITY[$activity],
            "diet"     => $diet,     "dietLabel"     => $DIET[$diet],
            "smoking"  => $smoking,  "smokingLabel"  => $SMOKING[$smoking],
            "stress"   => $stress,   "stressLabel"   => $STRESS[$stress],
            "riskKeys" => $riskKeys, "riskLabels" => $riskLabels, "riskCount" => $riskCount,
            "comments" => $comments,
            "savedAt"  => date("Y-m-d H:i:s"),
        ];

        $d["bmi"]           = $bmi;
        $d["bmiCat"]        = classifyBmi($bmi);
        $d["bpStatus"]      = classifyBp($sys, $dia);
        $d["glucoseStatus"] = classifyGlucose($glucose);
        $d["hrStatus"]      = classifyHeartRate($hr);

        // Health Risk Score
        $d["points"] = [
            "BMI"                    => bmiPoints($d["bmiCat"]),
            "Blood pressure"         => levelPoints($d["bpStatus"]),
            "Blood glucose"          => levelPoints($d["glucoseStatus"]),
            "Heart rate"             => heartPoints($d["hrStatus"]),
            "Lifestyle risk factors" => $riskCount,          // +1 per selected factor
        ];
        $d["riskScore"] = array_sum($d["points"]);
        $d["riskLevel"] = riskLevel($d["riskScore"]);

        // Creative features
        [$d["healthScore"], $d["penalties"]] = healthScore($d);
        $d["mainRisk"]        = mainRisk($d["penalties"]);
        $d["dailyFocus"]      = dailyFocus($d["mainRisk"]);
        $d["recommendations"] = buildRecommendations($d);
        $d["summary"]         = buildSummary($d);

        $recordNo = saveRecord($d);
        if ($recordNo > 0) {
            $d["recordNo"] = $recordNo;
            $result = $d;
            $_SESSION["token"] = bin2hex(random_bytes(16));   
            $old = [];                                          
            $oldRisks = [];
        } else {
            $saveError = true;
        }
    }
}

function old(string $k): string
{
    global $old;
    return (isset($old[$k]) && is_string($old[$k])) ? e($old[$k]) : "";
}
function checkedIf(string $k, string $v): string
{
    global $old;
    return (isset($old[$k]) && $old[$k] === $v) ? " checked" : "";
}
function selectedIf(string $k, string $v): string
{
    global $old;
    return (isset($old[$k]) && $old[$k] === $v) ? " selected" : "";
}
function fieldError(string $k): string
{
    global $errors;
    return isset($errors[$k]) ? '<p class="field-error">' . e($errors[$k]) . "</p>" : "";
}
function invalidClass(string $k): string
{
    global $errors;
    return isset($errors[$k]) ? " is-invalid" : "";
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DenSaulyq — Patient Health Monitoring Form (PHP)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
  <link rel="stylesheet" href="form.css">
</head>
<body>

  <header class="sidebar" id="top">
    <div class="brand">
      <span class="brand-icon" aria-hidden="true">💙</span>
      <h1 class="brand-name">DenSaulyq</h1>
    </div>
    <p class="brand-tag">Metabolic syndrome monitoring</p>

    <nav>
      <ul>
        <?php if ($result !== null): ?>
          <li><a href="#result">Result</a></li>
        <?php endif; ?>
        <li><a href="#form">Patient form</a></li>
        <li><a href="#how">How it's scored</a></li>
      </ul>
    </nav>

    <p class="sidebar-foot">Generated by PHP <?= PHP_VERSION ?> · <?= date("H:i") ?></p>
  </header>

  <main>

<?php if ($result !== null): ?>
    <section id="result" class="card-block result">
      <h2>Assessment for <?= e($result["fullName"]) ?></h2>
      <p class="section-lead save-ok">
        ✔ Record #<?= $result["recordNo"] ?> was saved to <code>patients.txt</code> on <?= e($result["savedAt"]) ?>.
      </p>

      <div class="result-top">
        <div class="risk-banner risk-<?= $result["riskLevel"] === "Low Risk" ? "low" : ($result["riskLevel"] === "Moderate Risk" ? "moderate" : "high") ?>">
          <p class="banner-label">Final risk level</p>
          <p class="banner-level"><?= e($result["riskLevel"]) ?></p>
          <p class="banner-score">Health Risk Score: <strong><?= $result["riskScore"] ?></strong></p>
        </div>

        <div class="score-box">
          <div class="score-ring <?= $result["healthScore"] >= 75 ? "ring-good" : ($result["healthScore"] >= 50 ? "ring-mid" : "ring-low") ?>"
               style="--score: <?= $result["healthScore"] ?>">
            <span class="score-num"><?= $result["healthScore"] ?></span>
          </div>
          <div>
            <p class="score-title">Health Score</p>
            <p class="score-sub">out of 100 — higher is better</p>
          </div>
        </div>
      </div>

      <div class="metric-grid">
        <div class="metric-tile tile-<?= statusClass($result["bmiCat"]) ?>">
          <span class="metric-icon" aria-hidden="true">⚖️</span>
          <p class="metric-label">BMI — <?= e($result["bmiCat"]) ?></p>
          <p class="metric-value"><?= number_format($result["bmi"], 1) ?><span class="metric-unit">kg/m²</span></p>
        </div>
        <div class="metric-tile tile-<?= statusClass($result["bpStatus"]) ?>">
          <span class="metric-icon" aria-hidden="true">🩺</span>
          <p class="metric-label">Blood pressure — <?= e($result["bpStatus"]) ?></p>
          <p class="metric-value"><?= $result["sys"] ?>/<?= $result["dia"] ?><span class="metric-unit">mmHg</span></p>
        </div>
        <div class="metric-tile tile-<?= statusClass($result["glucoseStatus"]) ?>">
          <span class="metric-icon" aria-hidden="true">💧</span>
          <p class="metric-label">Glucose — <?= e($result["glucoseStatus"]) ?></p>
          <p class="metric-value"><?= e(rtrim(rtrim(number_format($result["glucose"], 1, ".", ""), "0"), ".")) ?><span class="metric-unit">mg/dL</span></p>
        </div>
        <div class="metric-tile tile-<?= statusClass($result["hrStatus"]) ?>">
          <span class="metric-icon" aria-hidden="true">❤️</span>
          <p class="metric-label">Heart rate — <?= e($result["hrStatus"]) ?></p>
          <p class="metric-value"><?= $result["hr"] ?><span class="metric-unit">bpm</span></p>
        </div>
      </div>

      <h3 class="sub-h">Risk score breakdown</h3>
      <table class="sensor-table">
        <thead><tr><th>Factor</th><th>Value</th><th>Points</th></tr></thead>
        <tbody>
          <tr><td>BMI</td><td><?= number_format($result["bmi"], 1) ?> — <?= e($result["bmiCat"]) ?></td><td><?= $result["points"]["BMI"] ?></td></tr>
          <tr><td>Blood pressure</td><td><?= $result["sys"] ?>/<?= $result["dia"] ?> — <?= e($result["bpStatus"]) ?></td><td><?= $result["points"]["Blood pressure"] ?></td></tr>
          <tr><td>Blood glucose</td><td><?= e(rtrim(rtrim(number_format($result["glucose"], 1, ".", ""), "0"), ".")) ?> — <?= e($result["glucoseStatus"]) ?></td><td><?= $result["points"]["Blood glucose"] ?></td></tr>
          <tr><td>Heart rate</td><td><?= $result["hr"] ?> — <?= e($result["hrStatus"]) ?></td><td><?= $result["points"]["Heart rate"] ?></td></tr>
          <tr>
            <td>Lifestyle risk factors</td>
            <td>
              <?php if ($result["riskCount"] === 0): ?>
                none selected
              <?php else: ?>
                <?php foreach ($result["riskLabels"] as $label): ?>
                  <span class="chip"><?= e($label) ?></span>
                <?php endforeach; ?>
              <?php endif; ?>
            </td>
            <td><?= $result["points"]["Lifestyle risk factors"] ?></td>
          </tr>
          <tr class="total-row"><td colspan="2">Total Health Risk Score</td><td><?= $result["riskScore"] ?></td></tr>
        </tbody>
      </table>

      <div class="insight-grid">
        <div class="insight">
          <p class="insight-label">Most significant risk factor</p>
          <p class="insight-value"><?= e($result["mainRisk"] ?? "None found 🎉") ?></p>
        </div>
        <div class="insight">
          <p class="insight-label">Today's focus</p>
          <p class="insight-value"><?= e($result["dailyFocus"]) ?></p>
        </div>
      </div>

      <h3 class="sub-h">Automatic health summary</h3>
      <p class="summary-text"><?= e($result["summary"]) ?></p>

      <h3 class="sub-h">Personalized recommendations</h3>
      <ol class="rec-list">
        <?php foreach ($result["recommendations"] as $rec): ?>
          <li><?= e($rec) ?></li>
        <?php endforeach; ?>
      </ol>
      <p class="disclaimer">This is an educational estimate, not a medical diagnosis. Please consult a doctor about your results.</p>
    </section>
<?php endif; ?>

    <section id="form" class="card-block">
      <h2>Patient Health Form</h2>
      <p class="section-lead">Fill in the fields below. PHP validates the data, calculates your indicators and saves the record to <code>patients.txt</code>.</p>

<?php if ($saveError): ?>
      <div class="error-summary" role="alert">
        <p class="error-title">The record could not be saved.</p>
        <p>PHP was unable to write to <code>patients.txt</code>. Check that the folder is writable and try again.</p>
      </div>
<?php elseif (count($errors) > 0): ?>
      <div class="error-summary" role="alert">
        <p class="error-title">Please fix <?= count($errors) ?> problem<?= count($errors) === 1 ? "" : "s" ?> — nothing was saved.</p>
        <ul>
          <?php foreach ($errors as $msg): ?>
            <li><?= e($msg) ?></li>
          <?php endforeach; ?>
        </ul>
      </div>
<?php endif; ?>

      <form class="patient-form health-form" method="post" action="form.php#form" novalidate>
        <input type="hidden" name="token" value="<?= e($_SESSION["token"]) ?>">

        <fieldset>
          <legend>1. Personal information</legend>
          <div class="form-grid">
            <div class="field">
              <label for="first_name">First name *</label>
              <input type="text" id="first_name" name="first_name" maxlength="40" placeholder="Aruzhan" value="<?= old("first_name") ?>" class="<?= invalidClass("first_name") ?>">
              <?= fieldError("first_name") ?>
            </div>
            <div class="field">
              <label for="last_name">Last name *</label>
              <input type="text" id="last_name" name="last_name" maxlength="40" placeholder="Nurgaliyeva" value="<?= old("last_name") ?>" class="<?= invalidClass("last_name") ?>">
              <?= fieldError("last_name") ?>
            </div>
            <div class="field">
              <label for="email">Email *</label>
              <input type="email" id="email" name="email" maxlength="100" placeholder="name@example.com" value="<?= old("email") ?>" class="<?= invalidClass("email") ?>">
              <?= fieldError("email") ?>
            </div>
            <div class="field">
              <label for="age">Age (years) *</label>
              <input type="number" id="age" name="age" min="18" max="120" step="1" placeholder="45" value="<?= old("age") ?>" class="<?= invalidClass("age") ?>">
              <?= fieldError("age") ?>
            </div>
          </div>

          <div class="field">
            <span class="label-like">Gender *</span>
            <div class="choice-row">
              <?php foreach ($GENDERS as $g): ?>
                <label class="choice"><input type="radio" name="gender" value="<?= e($g) ?>"<?= checkedIf("gender", $g) ?>> <?= e($g) ?></label>
              <?php endforeach; ?>
            </div>
            <?= fieldError("gender") ?>
          </div>
        </fieldset>

        <fieldset>
          <legend>2. Body measurements and vitals</legend>
          <div class="form-grid">
            <div class="field">
              <label for="height">Height (cm) *</label>
              <input type="number" id="height" name="height" min="100" max="250" step="0.1" placeholder="170" value="<?= old("height") ?>" class="<?= invalidClass("height") ?>">
              <?= fieldError("height") ?>
            </div>
            <div class="field">
              <label for="weight">Weight (kg) *</label>
              <input type="number" id="weight" name="weight" min="30" max="300" step="0.1" placeholder="75" value="<?= old("weight") ?>" class="<?= invalidClass("weight") ?>">
              <?= fieldError("weight") ?>
            </div>
            <div class="field">
              <label for="systolic">Systolic pressure (mmHg) *</label>
              <input type="number" id="systolic" name="systolic" min="70" max="250" step="1" placeholder="120" value="<?= old("systolic") ?>" class="<?= invalidClass("systolic") ?>">
              <?= fieldError("systolic") ?>
            </div>
            <div class="field">
              <label for="diastolic">Diastolic pressure (mmHg) *</label>
              <input type="number" id="diastolic" name="diastolic" min="40" max="150" step="1" placeholder="80" value="<?= old("diastolic") ?>" class="<?= invalidClass("diastolic") ?>">
              <?= fieldError("diastolic") ?>
            </div>
            <div class="field">
              <label for="glucose">Fasting blood glucose (mg/dL) *</label>
              <input type="number" id="glucose" name="glucose" min="30" max="600" step="0.1" placeholder="95" value="<?= old("glucose") ?>" class="<?= invalidClass("glucose") ?>">
              <?= fieldError("glucose") ?>
            </div>
            <div class="field">
              <label for="heart_rate">Resting heart rate (bpm) *</label>
              <input type="number" id="heart_rate" name="heart_rate" min="30" max="220" step="1" placeholder="72" value="<?= old("heart_rate") ?>" class="<?= invalidClass("heart_rate") ?>">
              <?= fieldError("heart_rate") ?>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>3. Lifestyle</legend>
          <div class="form-grid">
            <div class="field">
              <label for="activity">Physical activity *</label>
              <select id="activity" name="activity" class="<?= invalidClass("activity") ?>">
                <option value="">— choose —</option>
                <?php foreach ($ACTIVITY as $k => $label): ?>
                  <option value="<?= e($k) ?>"<?= selectedIf("activity", $k) ?>><?= e($label) ?></option>
                <?php endforeach; ?>
              </select>
              <?= fieldError("activity") ?>
            </div>
            <div class="field">
              <label for="stress">Stress level *</label>
              <select id="stress" name="stress" class="<?= invalidClass("stress") ?>">
                <option value="">— choose —</option>
                <?php foreach ($STRESS as $k => $label): ?>
                  <option value="<?= e($k) ?>"<?= selectedIf("stress", $k) ?>><?= e($label) ?></option>
                <?php endforeach; ?>
              </select>
              <?= fieldError("stress") ?>
            </div>
          </div>

          <div class="field">
            <span class="label-like">Diet *</span>
            <div class="choice-col">
              <?php foreach ($DIET as $k => $label): ?>
                <label class="choice"><input type="radio" name="diet" value="<?= e($k) ?>"<?= checkedIf("diet", $k) ?>> <?= e($label) ?></label>
              <?php endforeach; ?>
            </div>
            <?= fieldError("diet") ?>
          </div>

          <div class="field">
            <span class="label-like">Smoking *</span>
            <div class="choice-row">
              <?php foreach ($SMOKING as $k => $label): ?>
                <label class="choice"><input type="radio" name="smoking" value="<?= e($k) ?>"<?= checkedIf("smoking", $k) ?>> <?= e($label) ?></label>
              <?php endforeach; ?>
            </div>
            <?= fieldError("smoking") ?>
          </div>
        </fieldset>

        <fieldset>
          <legend>4. Additional risk factors and comments</legend>
          <div class="field">
            <span class="label-like">Tick everything that applies (optional)</span>
            <div class="check-grid">
              <?php foreach ($RISKS as $k => $label): ?>
                <label class="choice"><input type="checkbox" name="risk_factors[]" value="<?= e($k) ?>"<?= in_array($k, $oldRisks, true) ? " checked" : "" ?>> <?= e($label) ?></label>
              <?php endforeach; ?>
            </div>
          </div>

          <div class="field">
            <label for="comments">Comments (optional, up to 500 characters)</label>
            <textarea id="comments" name="comments" rows="3" maxlength="500" placeholder="Medications, symptoms, anything the doctor should know…" class="<?= invalidClass("comments") ?>"><?= old("comments") ?></textarea>
            <?= fieldError("comments") ?>
          </div>
        </fieldset>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Calculate &amp; save</button>
          <button type="reset" class="btn btn-secondary">Reset</button>
          <span class="required-note">* required</span>
        </div>
      </form>
    </section>

    <section id="how" class="card-block">
      <h2>How the result is calculated</h2>
      <p class="section-lead">BMI = weight (kg) / height (m)². Every threshold below is applied in PHP with if / elseif / else.</p>

      <table class="sensor-table rules-table">
        <thead><tr><th>Indicator</th><th>Categories</th><th>Risk points</th></tr></thead>
        <tbody>
          <tr><td>BMI</td><td>&lt;18.5 Underweight · 18.5–24.9 Normal · 25–29.9 Overweight · ≥30 Obesity</td><td>Normal 0 · Overweight 1 · Obesity 2 (Underweight 1)</td></tr>
          <tr><td>Blood pressure</td><td>Low &lt;90/60 · Normal &lt;120/80 · Elevated 120–139 or 80–89 · High ≥140 or ≥90</td><td>Normal 0 · Elevated 1 · High 2 (Low 1)</td></tr>
          <tr><td>Fasting glucose</td><td>Low &lt;70 · Normal 70–99 · Elevated 100–125 · High ≥126 mg/dL</td><td>Normal 0 · Elevated 1 · High 2 (Low 1)</td></tr>
          <tr><td>Heart rate</td><td>Low &lt;60 · Normal 60–100 · High &gt;100 bpm</td><td>Normal 0 · Low/High 1</td></tr>
          <tr><td>Risk-factor checkboxes</td><td>Each ticked box</td><td>+1 each</td></tr>
        </tbody>
      </table>
      <p>Total 0–2 → <strong>Low Risk</strong> · 3–5 → <strong>Moderate Risk</strong> · 6+ → <strong>High Risk</strong>.</p>
      <p>The extra <strong>Health Score (0–100)</strong> starts at 100 and loses points for every abnormal value, weak lifestyle answer (activity, diet, smoking, stress) and ticked risk factor. The factor that costs the most points is shown as the <em>most significant risk</em>.</p>
    </section>

  </main>

  <footer>
    <div class="footer-inner">
      <div class="footer-col">
        <p class="brand-name">DenSaulyq</p>
        <p>IoT monitoring for metabolic syndrome care.</p>
      </div>
      <div class="footer-col">
        <p class="footer-heading">System</p>
        <p>Version 2.3 · Seminar #6 project (PHP forms)</p>
        <p>&copy; <?= date("Y") ?> DenSaulyq Health Systems</p>
      </div>
    </div>
  </footer>

</body>
</html>