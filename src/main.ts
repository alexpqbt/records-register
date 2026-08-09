import Database from "@tauri-apps/plugin-sql";

const db = await Database.load("sqlite:baptismal_records.db");

const registerForm = document.getElementById("registerForm") as HTMLFormElement;
const searchInput = document.getElementById("searchInput") as HTMLInputElement;
const resultBody = document.querySelector(
  ".search-result tbody",
) as HTMLTableSectionElement;
const infoModal = document.getElementById("infoModal") as HTMLDialogElement;
const closeInfoModal = document.getElementById(
  "closeInfoModal",
) as HTMLButtonElement;
const deleteModal = document.getElementById("deleteModal") as HTMLDialogElement;
const closeDeleteModal = document.getElementById(
  "closeDeleteModal",
) as HTMLButtonElement;
const cancelDelete = document.getElementById(
  "cancelDelete",
) as HTMLButtonElement;
const confirmDelete = document.getElementById(
  "confirmDelete",
) as HTMLButtonElement;
const editModal = document.getElementById("editModal") as HTMLDialogElement;
const closeEditModal = document.getElementById(
  "closeEditModal",
) as HTMLButtonElement;
const editForm = document.getElementById("editForm") as HTMLFormElement;

let pendingDeleteId: string | null = null;

async function submitForm(e: SubmitEvent) {
  e.preventDefault();

  const target = e.target as HTMLFormElement;
  const data = new FormData(target);

  await db.execute(
    "INSERT INTO records (lastname, firstname, middle, dofc) VALUES ($1, $2, $3, $4);",
    [
      data.get("lastname") as string,
      data.get("firstname") as string,
      (data.get("middle") as string) || null,
      data.get("communion-date") as string,
    ],
  );

  performSearch("");
  target.reset();
}

async function performSearch(query: string) {
  const rows = await db.select<Record<string, any>[]>(
    "SELECT * FROM records WHERE (firstname LIKE $1 OR lastname LIKE $2) AND is_active = 1 ORDER BY created_at DESC",
    [`%${query}%`, `%${query}%`],
  );
  renderResults(rows);
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });
}

function renderResults(rows: Record<string, any>[]) {
  if (!resultBody) return;
  resultBody.innerHTML = "";

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatDate(row.dofc)}</td>
      <td>${row.lastname}, ${row.firstname} ${row.middle ?? ""}</td>
      <td class="btn-group">
        <button class="info-btn" data-id=${row.id}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            class="lucide lucide-info-icon lucide-info">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </button>
        <button class="edit-btn" data-id=${row.id}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round" class="lucide lucide-square-pen-icon lucide-square-pen">
            <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path
              d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
          </svg></button>
        <button class="delete-btn" data-id=${row.id}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round" class="lucide lucide-trash2-icon lucide-trash-2">
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg></button>
      </td>
    `;
    resultBody.appendChild(tr);
  });
}

async function openInfoModal(id: string) {
  const rows = await db.select<Record<string, any>[]>(
    "SELECT * FROM records WHERE id = ?",
    [id],
  );
  const row = rows[0];
  if (!row) return;

  document.querySelector("#infoName")!.textContent =
    `${row.lastname}, ${row.firstname} ${row.middle ?? ""}`;
  document.querySelector("#infoDate")!.textContent = formatDate(row.dofc);
  document.querySelector("#infoCreatedAt")!.textContent = formatDate(
    row.created_at,
  );

  infoModal?.showModal();
}

function openDeleteModal(id: string) {
  pendingDeleteId = id;
  deleteModal?.showModal();
}

async function deleteRecord() {
  if (!pendingDeleteId) return;
  await db.execute("UPDATE records SET is_active = 0 WHERE id = $1", [
    pendingDeleteId,
  ]);
  pendingDeleteId = null;
  deleteModal?.close();
  performSearch(searchInput.value);
}

async function openEditModal(id: string) {
  const rows = await db.select<Record<string, any>[]>(
    "SELECT * FROM records WHERE id = $1",
    [id],
  );
  const row = rows[0];
  if (!row) return;

  (document.getElementById("editId") as HTMLInputElement).value = row.id;
  (document.getElementById("editLastname") as HTMLInputElement).value =
    row.lastname;
  (document.getElementById("editFirstname") as HTMLInputElement).value =
    row.firstname;
  (document.getElementById("editMiddle") as HTMLInputElement).value =
    row.middle ?? "";
  (document.getElementById("editDofc") as HTMLInputElement).value = row.dofc;

  editModal?.showModal();
}

async function submitEdit(e: SubmitEvent) {
  e.preventDefault();
  const data = new FormData(editForm);

  await db.execute(
    "UPDATE records SET lastname = $1, firstname = $2, middle = $3, dofc = $4 WHERE id = $5",
    [
      data.get("lastname") as string,
      data.get("firstname") as string,
      (data.get("middle") as string) || null,
      data.get("dofc") as string,
      data.get("id") as string,
    ],
  );

  editModal?.close();
  performSearch(searchInput.value);
}

function setupDialog(
  dialog: HTMLDialogElement | null,
  closeBtn: HTMLButtonElement | null,
) {
  closeBtn?.addEventListener("click", () => dialog?.close());

  if (!dialog) return;
  let mousedownOnBackdrop = false;
  dialog.addEventListener("mousedown", (e) => {
    mousedownOnBackdrop = e.target === dialog;
  });
  dialog.addEventListener("click", (e) => {
    if (mousedownOnBackdrop && e.target === dialog) dialog.close();
  });
}

editForm?.addEventListener("submit", submitEdit);

searchInput?.addEventListener("input", (e) => {
  performSearch((e.target as HTMLInputElement).value);
});

registerForm?.addEventListener("submit", submitForm);

resultBody?.addEventListener("click", (e) => {
  const target = (e.target as HTMLElement).closest("button");
  if (!target) return;

  const id = target.dataset.id;
  if (!id) return;

  if (target.classList.contains("info-btn")) {
    openInfoModal(id);
  } else if (target.classList.contains("delete-btn")) {
    openDeleteModal(id);
  } else if (target.classList.contains("edit-btn")) {
    openEditModal(id);
  }
});

cancelDelete?.addEventListener("click", () => deleteModal?.close());
confirmDelete?.addEventListener("click", deleteRecord);

performSearch("");

setupDialog(infoModal, closeInfoModal);
setupDialog(deleteModal, closeDeleteModal);
setupDialog(editModal, closeEditModal);
