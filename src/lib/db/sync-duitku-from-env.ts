/**
 * Dinonaktifkan — kredensial Duitku tenant tidak boleh disalin dari .env platform.
 * Setiap ISP mengisi sendiri di ISP → Integrasi → Duitku.
 */
console.error(
  "db:sync-duitku-env dinonaktifkan. Kredensial payment gateway harus diisi per tenant di menu Integrasi."
);
process.exit(1);
