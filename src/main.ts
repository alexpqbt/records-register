import Database from "@tauri-apps/plugin-sql";
import {
  $,
  formatDate,
  formatFullName,
  showError,
} from './scripts/utils';
import { icon } from './scripts/icons';
import { tabSwitcher } from "./scripts/tabs";
import { runAutoBackupIfDue } from "./scripts/backup";
import { showToast } from "./scripts/toast";
import { initTheme, applyTheme, toggleTheme } from "./scripts/theme";

// ---------- Setup ----------

const dbName = "baptismal_records.db"

const db = await Database.load(`sqlite:${dbName}`);

// ---------- DOM references ----------

const registerForm = $<HTMLFormElement>("registerForm");
const searchInput = $<HTMLInputElement>("searchInput");
const resultBody = document.querySelector(".search-result tbody") as HTMLTableSectionElement;

const clearButton = document.querySelectorAll<HTMLButtonElement>("[data-clear]");

const infoModal = $<HTMLDialogElement>("infoModal");
const closeInfoModal = $<HTMLButtonElement>("closeInfoModal");

const deleteModal = $<HTMLDialogElement>("deleteModal");
const closeDeleteModal = $<HTMLButtonElement>("closeDeleteModal");
const cancelDelete = $<HTMLButtonElement>("cancelDelete");
const confirmDelete = $<HTMLButtonElement>("confirmDelete");

const editModal = $<HTMLDialogElement>("editModal");
const closeEditModal = $<HTMLButtonElement>("closeEditModal");
const editForm = $<HTMLFormElement>("editForm");

const themeSwitcher = $<HTMLButtonElement>("themeSwitcher");
const html = document.documentElement;

const toastContainer = $<HTMLDivElement>("toastContainer");

const tablists = document.querySelectorAll<HTMLElement>('[role="tablist"]');

const addOfficial = $<HTMLButtonElement>("addOfficial");
const officialModal = $<HTMLDialogElement>("officialModal");
const closeOfficialModal = $<HTMLButtonElement>("closeOfficialModal");

const addSchool = $<HTMLButtonElement>("addSchool");
const schoolModal = $<HTMLDialogElement>("schoolModal");
const closeSchoolModal = $<HTMLButtonElement>("closeSchoolModal");

let pendingDeleteId: string | null = null;

// ---------- Register ----------

async function submitForm(e: SubmitEvent) {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const data = new FormData(form);

  try {
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
    showToast(toastContainer, "Record added.");
  } catch (err) {
    console.error(err);
    showError("Could not save the record. Please try again.");
  }
}

// ---------- Search / render ----------

async function performSearch(query: string) {
  try {
    const rows = await db.select<Record<string, any>[]>(
      "SELECT * FROM records WHERE (firstname LIKE $1 OR lastname LIKE $2) AND is_active = 1 ORDER BY created_at DESC",
      [`%${query}%`, `%${query}%`],
    );
    renderResults(rows);
  } catch (err) {
    console.error(err);
    showError("Could not load records.");
  }
}

function renderResults(rows: Record<string, any>[]) {
  if (!resultBody) return;

  if (rows.length === 0) {
    resultBody.innerHTML = `
      <tr>
        <td colspan="3" class="empty-state">No records found.</td>
      </tr>
    `;
    return;
  }

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
  try {
    await db.execute("UPDATE records SET is_active = 0 WHERE id = $1", [pendingDeleteId]);
    deleteModal.close();
    performSearch(searchInput.value);
    showToast(toastContainer, "Record deleted.");
  } catch (err) {
    console.error(err);
    showError("Could not delete the record.");
  } finally {
    pendingDeleteId = null;
  }
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

  try {
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
    showToast(toastContainer, "Record updated.");
  } catch (err) {
    console.error(err);
    showError("Could not save changes.");
  }
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

tablists.forEach((tablist) => tabSwitcher(tablist));

registerForm.addEventListener("submit", submitForm);
editForm.addEventListener("submit", submitEdit);

clearButton.forEach((btn) => {
  btn.addEventListener("click", () => {
    btn.closest("form")?.reset();
  });
});

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

// TODO: Add db logic
addOfficial.addEventListener("click", () => officialModal.showModal());

// TODO: Add db logic
addSchool.addEventListener("click", () => schoolModal.showModal());

setupDialog(infoModal, closeInfoModal);
setupDialog(deleteModal, closeDeleteModal);
setupDialog(editModal, closeEditModal);
setupDialog(officialModal, closeOfficialModal);
setupDialog(schoolModal, closeSchoolModal);

// ---------- Theme ----------

initTheme(html, themeSwitcher);

themeSwitcher.addEventListener("click", toggleTheme);

applyTheme((localStorage.getItem("theme") as "light" | "dark") ?? "light");

// ---------- Init ----------

performSearch("");
runAutoBackupIfDue(dbName);