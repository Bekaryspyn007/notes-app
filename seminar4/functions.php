<?php
date_default_timezone_set("Asia/Almaty");

function e($value): string
{
    return htmlspecialchars((string)$value, ENT_QUOTES, "UTF-8");
}

function validInt(string $v, int $min, int $max): bool
{
    $n = filter_var($v, FILTER_VALIDATE_INT);
    return $n !== false && $n >= $min && $n <= $max;
}

function validFloat(string $v, float $min, float $max): bool
{
    $n = filter_var($v, FILTER_VALIDATE_FLOAT);
    return $n !== false && $n >= $min && $n <= $max;
}

function calcBmi(float $weightKg, float $heightCm): float
{
    $m = $heightCm / 100;
    return round($weightKg / ($m * $m), 1);
}

function bmiCategory(float $bmi): string
{
    if ($bmi < 18.5) {
        return "Underweight";
    } elseif ($bmi < 25) {
        return "Normal";
    } elseif ($bmi < 30) {
        return "Overweight";
    }
    return "Obesity";
}

function bpCategory(int $sys, int $dia): string
{
    if ($sys < 90 || $dia < 60) {
        return "Low";
    } elseif ($sys >= 130 || $dia >= 80) {
        return "High";
    } elseif ($sys >= 120) {          
        return "Elevated";
    }
    return "Normal";
}

function glucoseCategory(float $g): string
{
    if ($g < 70) {
        return "Low";
    } elseif ($g < 100) {
        return "Normal";
    } elseif ($g < 126) {
        return "Elevated";
    }
    return "High";
}

function heartRateCategory(int $hr): string
{
    if ($hr < 60) {
        return "Low";
    } elseif ($hr <= 100) {
        return "Normal";
    }
    return "High";
}

function categoryClass(string $cat): string
{
    if ($cat === "Normal") {
        return "badge-normal";
    } elseif (in_array($cat, ["Low", "Underweight", "Elevated", "Overweight"], true)) {
        return "badge-warning";
    }
    return "badge-critical";
}

function riskClass(string $level): string
{
    if ($level === "Low") {
        return "badge-normal";
    } elseif ($level === "Moderate") {
        return "badge-warning";
    }
    return "badge-critical";
}

function riskFactorLabels(): array
{
    return [
        "family_diabetes" => "Family history of diabetes",
        "family_heart"    => "Family history of heart disease",
        "cholesterol"     => "High cholesterol",
        "abdominal_fat"   => "Excess abdominal fat",
    ];
}

function assessRisk(array $d): array
{
    $points = 0;
    $reasons = [];
    $add = function (int $p, string $why) use (&$points, &$reasons) {
        $points += $p;
        $reasons[] = "$why (+$p)";
    };

    if ($d["bmi_cat"] === "Overweight") {
        $add(1, "Overweight");
    } elseif ($d["bmi_cat"] === "Obesity") {
        $add(2, "Obesity");
    }
    if ($d["bp_cat"] === "Elevated") {
        $add(1, "Elevated blood pressure");
    } elseif ($d["bp_cat"] === "High") {
        $add(2, "High blood pressure");
    }
    if ($d["glucose_cat"] === "Elevated") {
        $add(1, "Elevated blood glucose");
    } elseif ($d["glucose_cat"] === "High") {
        $add(2, "High blood glucose");
    }
    if ($d["hr_cat"] !== "Normal") {
        $add(1, "Heart rate outside 60-100 bpm");
    }
    if ($d["smoking"] === "current") {
        $add(2, "Current smoker");
    } elseif ($d["smoking"] === "former") {
        $add(1, "Former smoker");
    }
    if ($d["activity"] === "sedentary") {
        $add(2, "Sedentary lifestyle");
    } elseif ($d["activity"] === "light") {
        $add(1, "Low physical activity");
    }
    if ($d["diet"] === "unhealthy") {
        $add(1, "Unhealthy diet");
    }
    if ($d["stress"] === "high") {
        $add(1, "High stress level");
    }
    if ($d["age"] >= 45) {
        $add(1, "Age 45 or older");
    }
    $labels = riskFactorLabels();
    foreach ($d["factors"] as $key) {
        $add(1, $labels[$key]);
    }

    if ($points <= 2) {
        $level = "Low";
    } elseif ($points <= 5) {
        $level = "Moderate";
    } else {
        $level = "High";
    }
    return ["points" => $points, "level" => $level, "reasons" => $reasons];
}

function saveToTextFile(array $fields): bool
{
    $dir = __DIR__ . "/data";
    if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
        return false;
    }
    $parts = [];
    foreach ($fields as $label => $value) {
        $clean = str_replace(["\r", "\n", "|"], " ", (string)$value);
        $parts[] = "$label: $clean";
    }
    $line = implode(" | ", $parts) . PHP_EOL;
    return file_put_contents($dir . "/health_records.txt", $line, FILE_APPEND | LOCK_EX) !== false;
}

function renderSelect(string $name, array $options, string $current): string
{
    $html = '<select name="' . e($name) . '" id="' . e($name) . '"><option value="">-- choose --</option>';
    foreach ($options as $v => $label) {
        $sel = ((string)$v === $current) ? " selected" : "";
        $html .= '<option value="' . e($v) . '"' . $sel . '>' . e($label) . '</option>';
    }
    return $html . '</select>';
}

function renderRadios(string $name, array $options, string $current): string
{
    $html = '<div class="choice-row">';
    foreach ($options as $v => $label) {
        $chk = ((string)$v === $current) ? " checked" : "";
        $html .= '<label class="choice"><input type="radio" name="' . e($name) . '" value="' . e($v) . '"' . $chk . '> ' . e($label) . '</label>';
    }
    return $html . '</div>';
}

function renderChecks(string $name, array $options, array $selected): string
{
    $html = '<div class="choice-row">';
    foreach ($options as $v => $label) {
        $chk = in_array((string)$v, $selected, true) ? " checked" : "";
        $html .= '<label class="choice"><input type="checkbox" name="' . e($name) . '[]" value="' . e($v) . '"' . $chk . '> ' . e($label) . '</label>';
    }
    return $html . '</div>';
}
