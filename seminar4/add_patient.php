<?php
require "functions.php";
require "db.php";

$errors  = [];
$success = "";
$in = ["full_name" => "", "age" => "", "email" => "", "phone" => ""];

[$pdo, $dbError] = connectDb();

if ($_SERVER["REQUEST_METHOD"] === "POST" && $pdo) {
    foreach (array_keys($in) as $k) {
        $in[$k] = is_string($_POST[$k] ?? null) ? trim($_POST[$k]) : "";
    }

    if (!preg_match('/^[\p{L} \'\-]{2,100}$/u', $in["full_name"])) {
        $errors[] = "Full name must be 2-100 letters (no digits or symbols).";
    }
    if (!validInt($in["age"], 1, 120)) {
        $errors[] = "Age must be a whole number from 1 to 120.";
    }
    if (!filter_var($in["email"], FILTER_VALIDATE_EMAIL)) {
        $errors[] = "Enter a valid email address.";
    }
    if ($in["phone"] !== "" && !preg_match('/^\+?[0-9 ()\-]{7,20}$/', $in["phone"])) {
        $errors[] = "Phone may contain only digits, spaces, +, ( ) and -.";
    }

    if (!$errors) {
        try {
            if (findPatientIdByEmail($pdo, $in["email"]) !== null) {
                $errors[] = "A patient with this email already exists.";
            } else {
                $id = insertPatient($pdo, $in["full_name"], (int)$in["age"], $in["email"], $in["phone"] === "" ? null : $in["phone"]);
                $success = "Patient saved with ID $id.";
                $in = ["full_name" => "", "age" => "", "email" => "", "phone" => ""];
            }
        } catch (PDOException $ex) {
            $errors[] = "Database error: " . $ex->getMessage();
        }
    }
}

$pageTitle = "Add patient";
$active    = "patient";
require "header.php";
?>

    <section class="card-block">
      <h2>Add a Patient</h2>
      <p class="section-lead">Saves a new row in the <code>patients</code> table.</p>

      <?php if ($dbError): ?>
        <div class="msg msg-error"><?= e($dbError) ?></div>
      <?php endif; ?>
      <?php if ($success): ?>
        <div class="msg msg-ok"><?= e($success) ?> <a href="add_measurement.php">Record a measurement →</a></div>
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

      <form class="app-form" method="post" action="add_patient.php">
        <div class="form-grid">
          <div class="field">
            <label for="full_name">Full name</label>
            <input type="text" id="full_name" name="full_name" value="<?= e($in["full_name"]) ?>" required>
          </div>
          <div class="field">
            <label for="age">Age</label>
            <input type="number" id="age" name="age" min="1" max="120" value="<?= e($in["age"]) ?>" required>
          </div>
          <div class="field">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" value="<?= e($in["email"]) ?>" required>
          </div>
          <div class="field">
            <label for="phone">Phone (optional)</label>
            <input type="text" id="phone" name="phone" value="<?= e($in["phone"]) ?>" placeholder="+7 701 000 00 00">
          </div>
        </div>
        <div class="actions">
          <button type="submit" class="btn btn-primary">Save patient</button>
          <button type="reset" class="btn btn-secondary">Reset</button>
        </div>
      </form>
    </section>

<?php require "footer.php"; ?>
