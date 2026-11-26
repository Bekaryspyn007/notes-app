<?php
$pageTitle = $pageTitle ?? "DenSaulyq";
$active    = $active ?? "";
$navItems  = [
    "monitor"     => ["index.php", "Monitor"],
    "health"      => ["health_form.php", "Health form"],
    "patient"     => ["add_patient.php", "Add patient"],
    "measurement" => ["add_measurement.php", "Add measurement"],
    "history"     => ["history.php", "History"],
    "setup"       => ["setup.php", "Database setup"],
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= e($pageTitle) ?> — DenSaulyq</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
  <link rel="stylesheet" href="monitor.css">
  <link rel="stylesheet" href="forms.css">
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
        <?php foreach ($navItems as $key => [$file, $label]): ?>
          <li><a href="<?= e($file) ?>" class="<?= $key === $active ? "nav-active" : "" ?>"><?= e($label) ?></a></li>
        <?php endforeach; ?>
      </ul>
    </nav>

    <p class="sidebar-foot">PHP <?= PHP_VERSION ?> · <?= date("H:i") ?></p>
  </header>

  <main>
