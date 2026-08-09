import Database from "@tauri-apps/plugin-sql";

// ---------- Setup ----------

const db = await Database.load("sqlite:baptismal_records.db");

function $<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

// ---------- DOM references ----------

const registerForm = $<HTMLFormElement>("registerForm");
const searchInput = $<HTMLInputElement>("searchInput");
const resultBody = document.querySelector(".search-result tbody") as HTMLTableSectionElement;

const infoModal = $<HTMLDialogElement>("infoModal");
const closeInfoModal = $<HTMLButtonElement>("closeInfoModal");

const deleteModal = $<HTMLDialogElement>("deleteModal");
const closeDeleteModal = $<HTMLButtonElement>("closeDeleteModal");
const cancelDelete = $<HTMLButtonElement>("cancelDelete");
const confirmDelete = $<HTMLButtonElement>("confirmDelete");

const editModal = $<HTMLDialogElement>("editModal");
const closeEditModal = $<HTMLButtonElement>("closeEditModal");
const editForm = $<HTMLFormElement>("editForm");

let pendingDeleteId: string | null = null;

// ---------- Formatting ----------

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });
}

function formatFullName(row: Record<string, any>): string {
  return `${row.lastname}, ${row.firstname} ${row.middle ?? ""}`.trim();
}

// ---------- Icons ----------

const ICONS = {
  info: `<circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />`,
  edit: `<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
         <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />`,
  delete: `<path d="M10 11v6" /><path d="M14 11v6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
           <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />`,
};

function icon(name: keyof typeof ICONS): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    ${ICONS[name]}
  </svg>`;
}

// ---------- Register ----------

async function submitForm(e: SubmitEvent) {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const data = new FormData(form);

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
  form.reset();
}

// ---------- Search / render ----------

async function performSearch(query: string) {
  const rows = await db.select<Record<string, any>[]>(
    "SELECT * FROM records WHERE (firstname LIKE $1 OR lastname LIKE $2) AND is_active = 1 ORDER BY created_at DESC",
    [`%${query}%`, `%${query}%`],
  );
  renderResults(rows);
}

function renderResults(rows: Record<string, any>[]) {
  if (!resultBody) return;
  resultBody.innerHTML = rows.map(rowToHtml).join("");
}

function rowToHtml(row: Record<string, any>): string {
  return `
    <tr>
      <td>${formatDate(row.dofc)}</td>
      <td>${formatFullName(row)}</td>
      <td class="btn-group">
        <button class="info-btn" data-id="${row.id}">${icon("info")}</button>
        <button class="edit-btn" data-id="${row.id}">${icon("edit")}</button>
        <button class="delete-btn" data-id="${row.id}">${icon("delete")}</button>
      </td>
    </tr>
  `;
}

async function fetchRecord(id: string): Promise<Record<string, any> | undefined> {
  const rows = await db.select<Record<string, any>[]>(
    "SELECT * FROM records WHERE id = $1",
    [id],
  );
  return rows[0];
}

// ---------- Info modal ----------

async function openInfoModal(id: string) {
  const row = await fetchRecord(id);
  if (!row) return;

  $("infoName").textContent = formatFullName(row);
  $("infoDate").textContent = formatDate(row.dofc);
  $("infoCreatedAt").textContent = formatDate(row.created_at);

  infoModal.showModal();
}

// ---------- Delete modal ----------

function openDeleteModal(id: string) {
  pendingDeleteId = id;
  deleteModal.showModal();
}

async function deleteRecord() {
  if (!pendingDeleteId) return;
  await db.execute("UPDATE records SET is_active = 0 WHERE id = $1", [pendingDeleteId]);
  pendingDeleteId = null;
  deleteModal.close();
  performSearch(searchInput.value);
}

// ---------- Edit modal ----------

async function openEditModal(id: string) {
  const row = await fetchRecord(id);
  if (!row) return;

  $<HTMLInputElement>("editId").value = row.id;
  $<HTMLInputElement>("editLastname").value = row.lastname;
  $<HTMLInputElement>("editFirstname").value = row.firstname;
  $<HTMLInputElement>("editMiddle").value = row.middle ?? "";
  $<HTMLInputElement>("editDofc").value = row.dofc;

  editModal.showModal();
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

  editModal.close();
  performSearch(searchInput.value);
}

// ---------- Dialog behavior (backdrop click + close button) ----------

function setupDialog(dialog: HTMLDialogElement, closeBtn: HTMLButtonElement) {
  closeBtn.addEventListener("click", () => dialog.close());

  let mousedownOnBackdrop = false;
  dialog.addEventListener("mousedown", (e) => {
    mousedownOnBackdrop = e.target === dialog;
  });
  dialog.addEventListener("click", (e) => {
    if (mousedownOnBackdrop && e.target === dialog) dialog.close();
  });
}

// ---------- Event wiring ----------

registerForm.addEventListener("submit", submitForm);
editForm.addEventListener("submit", submitEdit);

searchInput.addEventListener("input", (e) => {
  performSearch((e.target as HTMLInputElement).value);
});

resultBody.addEventListener("click", (e) => {
  const target = (e.target as HTMLElement).closest("button");
  const id = target?.dataset.id;
  if (!target || !id) return;

  if (target.classList.contains("info-btn")) openInfoModal(id);
  else if (target.classList.contains("delete-btn")) openDeleteModal(id);
  else if (target.classList.contains("edit-btn")) openEditModal(id);
});

cancelDelete.addEventListener("click", () => deleteModal.close());
confirmDelete.addEventListener("click", deleteRecord);

setupDialog(infoModal, closeInfoModal);
setupDialog(deleteModal, closeDeleteModal);
setupDialog(editModal, closeEditModal);

// ---------- Init ----------

performSearch("");