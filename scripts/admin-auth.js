// admin-auth.js
(function () {
  const form = document.getElementById("admin-login-form");
  const msg = document.getElementById("login-msg");
  const demoBtn = document.getElementById("demo-btn");

  function showMessage(text, isError) {
    msg.textContent = text;
    msg.style.color = isError ? "#9b1c1c" : "#1a7f37";
  }

  demoBtn &&
    demoBtn.addEventListener("click", function () {
      document.getElementById("email").value = "admin@admin.com";
      document.getElementById("password").value = "1234";
    });

  form &&
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      if (!email || !password) {
        showMessage("Molimo unesite email i lozinku.", true);
        return;
      }

      showMessage("Prijava...", false);

      // allow explicit backend base URL (useful when frontend is served from different origin)
      var BASE_URL = window.getSVZBaseUrl();

      fetch(BASE_URL + "/api/admin/auth/login", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email, password: password }),
      })
        .then(function (r) {
          if (!r.ok) {
            // try to extract useful message from JSON body
            return r
              .json()
              .then(function (j) {
                var msg =
                  j && (j.message || j.detail || j.error || j.msg)
                    ? j.message || j.detail || j.error || j.msg
                    : JSON.stringify(j);
                throw { status: r.status, message: msg };
              })
              .catch(function () {
                throw { status: r.status, message: "Neuspjela prijava" };
              });
          }
          return r.json().catch(function () {
            return {};
          });
        })
        .then(function (data) {
          // expected { access_token: '...', token_type: 'bearer' } or similar
          const token = data.token;
          if (token) {
            // if server returns object with data.token
            localStorage.setItem("svz_admin_token", token);
          } else {
            localStorage.setItem("svz_admin_token", null);
            showMessage("Uspjela prijava, ali nije pronađen token.", true);
            return;
          }

          showMessage("Prijava uspješna — preusmjeravam...", false);
          // short delay so user sees message
          setTimeout(function () {
            // redirect to blog create page (relative path)
            window.location.href = "/blog/create.html";
          }, 700);
        })
        .catch(function (err) {
          console.error("login error", err);
          var m =
            "Neuspjela prijava — provjerite korisničke podatke i backend.";
          if (err && err.message) {
            m = err.message;
            if (err.status) m = "Greška " + err.status + ": " + m;
          }
          showMessage(m, true);
        });
    });
})();
