// EmailJS Configuration
const EMAILJS_PUBLIC_KEY = "3IDB_1FNL6gwDO5f1";
const EMAILJS_SERVICE_ID = "service_00qomru";
const EMAILJS_TEMPLATE_ID = "template_a1a9axs";

// Inicijaliziraj EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

// Dodaj event listener na formu
const contactForm = document.querySelector(".contact-form");
if (contactForm) {
  contactForm.addEventListener("submit", function (e) {
    e.preventDefault();

    // Uzmi vrijednosti iz forme
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const message = document.getElementById("message").value;

    // Generiraj trenutni datum
    const currentDate = new Date().toLocaleString("hr-HR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Parametri za slanje (moraju odgovarati varijablama u template-u)
    const templateParams = {
      user_name: name,
      user_email: email,
      message: message,
      current_date: currentDate,
    };

    // Promijeni tekst dugmeta u "Šaljem..."
    const submitButton = this.querySelector('button[type="submit"]');
    const originalButtonText = submitButton ? submitButton.textContent : "";
    if (submitButton) {
      submitButton.textContent = "Šaljem...";
      submitButton.disabled = true;
    }

    // Posalji email
    emailjs
      .send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
      .then(
        function (response) {
          console.log("SUCCESS!", response.status, response.text);

          if (typeof showToast === "function") {
            showToast(
              "Poruka je uspješno poslana! Odgovorit ćemo vam uskoro.",
              {
                background: "#2e7d32",
              }
            );
          } else {
            alert("Poruka je uspješno poslana! Odgovorit ćemo vam uskoro.");
          }

          contactForm.reset();
        },
        function (error) {
          console.log("FAILED...", error);

          if (typeof showToast === "function") {
            showToast(
              "Greška prilikom slanja poruke. Molimo pokušajte ponovo.",
              {
                background: "#c0392b",
              }
            );
          } else {
            alert("Greška prilikom slanja poruke. Molimo pokušajte ponovo.");
          }
        }
      )
      .finally(function () {
        if (submitButton) {
          submitButton.textContent = originalButtonText;
          submitButton.disabled = false;
        }
      });
  });
}
