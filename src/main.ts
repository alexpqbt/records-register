import Database from "@tauri-apps/plugin-sql";
import {
  $,
  formatDate,
  formatFullName,
  showError,
  toTitleCase,
} from './scripts/utils';
import { icon } from './scripts/icons';
import { tabSwitcher } from "./scripts/tabs";
import { runAutoBackupIfDue } from "./scripts/backup";
import { showToast } from "./scripts/toast";
import { initTheme, applyTheme, toggleTheme } from "./scripts/theme";
import { DB_NAME } from "./scripts/constants";
import { initPins, restorePinned } from "./scripts/pin";

// ---------- Setup ----------

const db = await Database.load(`sqlite:${DB_NAME}`);

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
const officialForm = $<HTMLFormElement>("officialForm");

const addSchool = $<HTMLButtonElement>("addSchool");
const schoolModal = $<HTMLDialogElement>("schoolModal");
const closeSchoolModal = $<HTMLButtonElement>("closeSchoolModal");
const schoolForm = $<HTMLFormElement>("schoolForm");

let pendingDeleteId: string | null = null;

// ---------- Register ----------

async function submitForm(e: SubmitEvent) {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const data = new FormData(form);

  try {
    await db.execute(
      "INSERT INTO records (lastname, firstname, middle, dofc, official_id, school_id) VALUES ($1, $2, $3, $4, $5, $6);",
      [
        data.get("lastname") as string,
        data.get("firstname") as string,
        (data.get("middle") as string) || null,
        data.get("communion-date") as string,
        (data.get("official_id") as string) || null,
        (data.get("school_id") as string) || null,
      ],
    );
    performSearch("");
    form.reset();
    restorePinned(form);
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

async function fetchOfficial(id: string): Promise<Record<string, any> | undefined> {
  const rows = await db.select<Record<string, any>[]>(
    "SELECT * FROM official WHERE id = $1",
    [id],
  );
  return rows[0];
}

async function fetchSchool(id: string): Promise<Record<string, any> | undefined> {
  const rows = await db.select<Record<string, any>[]>(
    "SELECT * FROM school WHERE id = $1",
    [id],
  );
  return rows[0];
}

// ---------- Info modal ----------

async function openInfoModal(id: string) {
  const record = await fetchRecord(id);
  if (!record) return;

  const official = await fetchOfficial(record.official_id);
  if (!official) return;

  const school = await fetchSchool(record.school_id);
  if (!school) return;

  console.log(official, school);

  $("infoName").textContent = formatFullName(record);
  $("infoDate").textContent = formatDate(record.dofc);
  $("infoCreatedAt").textContent = formatDate(record.created_at);
  $("infoOfficial").textContent = formatFullName(official);
  $("infoSchool").textContent = toTitleCase(school.name);

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

  await Promise.all([
    loadOfficialSelect("editOfficialSelect", row.official_id),
    loadSchoolSelect("editSchoolSelect", row.school_id),
  ]);

  editModal.showModal();
}

async function submitEdit(e: SubmitEvent) {
  e.preventDefault();
  const data = new FormData(editForm);

  try {
    await db.execute(
      "UPDATE records SET lastname = $1, firstname = $2, middle = $3, dofc = $4, official_id = $5, school_id = $6 WHERE id = $7",
      [
        data.get("lastname") as string,
        data.get("firstname") as string,
        (data.get("middle") as string) || null,
        data.get("dofc") as string,
        (data.get("official_id") as string) || null,
        (data.get("school_id") as string) || null,
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

// ---------- Official modal ----------

async function saveOfficial(title: string, firstname: string, lastname: string): Promise<void> {
  await db.execute(
    "INSERT INTO official (title, firstname, lastname) VALUES ($1, $2, $3);",
    [title, firstname, lastname],
  );
}

async function submitOfficial(e: SubmitEvent) {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const data = new FormData(form);

  const title = ((data.get("official-title") as string) ?? "").trim();
  const firstname = ((data.get("official-firstname") as string) ?? "").trim();
  const lastname = ((data.get("official-lastname") as string) ?? "").trim();

  if (!firstname || !lastname) {
    showError("First name and last name are required.");
    return;
  }

  try {
    await saveOfficial(title, firstname, lastname);
    form.reset();
    officialModal.close();
    await loadOfficialSelect("officialSelect");
    showToast(toastContainer, "Official added.");
  } catch (err) {
    console.error(err);
    showError("Could not save the official. Please try again.");
  }
}

// ---------- School modal ----------

async function saveSchool(schoolName: string): Promise<void> {
  await db.execute(
    "INSERT INTO school (name) VALUES ($1);",
    [schoolName],
  );
}

async function submitSchool(e: SubmitEvent) {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const data = new FormData(form);

  const schoolName = ((data.get("school-name") as string) ?? "").trim();

  if (!schoolName) {
    showError("School name is required.");
    return;
  }

  try {
    await saveSchool(schoolName);
    form.reset();
    schoolModal.close();
    await loadSchoolSelect("schoolSelect");
    showToast(toastContainer, "School added.");
  } catch (err) {
    console.error(err);
    showError("Could not save the school. Please try again.");
  }
}

// ---------- Select population ----------

function buildOption(value: string, label: string): HTMLOptionElement {
  const opt = document.createElement("option");
  opt.value = value;
  opt.textContent = label;
  return opt;
}

const OFFICIALS_SQL = "SELECT id, title, firstname, lastname FROM official ORDER BY lastname, firstname";
const SCHOOLS_SQL = "SELECT id, name FROM school ORDER BY name";

function officialLabel(r: Record<string, any>): string {
  return [r.title, r.firstname, r.lastname].filter(Boolean).join(" ");
}

function schoolLabel(r: Record<string, any>): string {
  return r.name;
}

async function fillSelect(
  selectId: string,
  sql: string,
  labelFn: (r: Record<string, any>) => string,
  selectedId?: string | number | null,
) {
  const select = $<HTMLSelectElement>(selectId);

  try {
    const rows = await db.select<Record<string, any>[]>(sql, []);
    select.replaceChildren(
      buildOption("", "-- None --"),
      ...rows.map((r) => buildOption(String(r.id), labelFn(r))),
    );
    select.value = selectedId != null ? String(selectedId) : "";
  } catch (err) {
    console.error(err);
    showError(`Could not load options for ${selectId}.`);
  }
}

const loadOfficialSelect = (id: string, selected?: string | number | null) => fillSelect(id, OFFICIALS_SQL, officialLabel, selected);

const loadSchoolSelect = (id: string, selected?: string | number | null) => fillSelect(id, SCHOOLS_SQL, schoolLabel, selected);

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
officialForm.addEventListener("submit", submitOfficial);
schoolForm.addEventListener("submit", submitSchool);

clearButton.forEach((btn) => {
  btn.addEventListener("click", () => {
    const form = btn.closest("form") as HTMLFormElement | null;
    if (!form) return;
    form.reset();
    restorePinned(form);
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

addOfficial.addEventListener("click", () => officialModal.showModal());

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
runAutoBackupIfDue(DB_NAME);
await Promise.all([
  loadOfficialSelect("officialSelect"),
  loadSchoolSelect("schoolSelect"),
]);
initPins(registerForm);