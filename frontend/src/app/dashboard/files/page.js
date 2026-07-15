"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ConfirmModal from "@/components/ui/ConfirmModal";
import RenameModal from "@/components/ui/RenameModal";
import { useToast } from "@/components/ui/ToastProvider";

import {
  ArrowUpDown,
  ChevronRight,
  Download,
  FileText,
  Folder,
  FolderPlus,
  Grid2X2,
  Home,
  List,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import {
  apiClient,
  authHeaders,
  formatBytes,
  getToken,
  handleAuthError,
} from "@/lib/api";

const ROOT_DISPLAY_NAME = "Vault Root";

const sortItems = (items, sortBy) => {
  const copiedItems = [...items];

  if (sortBy === "name") {
    return copiedItems.sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
  }

  if (sortBy === "newest") {
    return copiedItems.sort((a, b) => {
      const dateA = new Date(a.modifiedTime || a.createdTime || 0).getTime();
      const dateB = new Date(b.modifiedTime || b.createdTime || 0).getTime();

      return dateB - dateA;
    });
  }

  if (sortBy === "size") {
    return copiedItems.sort((a, b) => Number(b.size || 0) - Number(a.size || 0));
  }

  return copiedItems;
};

export default function FilesPage() {
  const fileInputRef = useRef(null);
  const toast = useToast();

  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [breadcrumb, setBreadcrumb] = useState([
    {
      id: null,
      name: ROOT_DISPLAY_NAME,
    },
  ]);

  const [renameModal, setRenameModal] = useState({
    open: false,
    item: null,
    type: "",
  });

  const [deleteModal, setDeleteModal] = useState({
    open: false,
    item: null,
    type: "",
  });

  const [loading, setLoading] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [folderName, setFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [sortBy, setSortBy] = useState("name");
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [error, setError] = useState("");

  const [pendingUploadFiles, setPendingUploadFiles] = useState([]);
  const [showDestinationModal, setShowDestinationModal] = useState(false);
  const [newUploadFolderName, setNewUploadFolderName] = useState("");
  const [creatingUploadFolder, setCreatingUploadFolder] = useState(false);

  const currentFolder = breadcrumb[breadcrumb.length - 1];
  const currentFolderId = currentFolder?.id || null;

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      if (!token) {
        window.location.href = "/login";
        return;
      }

      const query = currentFolderId
        ? `?parentFolderId=${encodeURIComponent(currentFolderId)}`
        : "";

      const [filesRes, foldersRes] = await Promise.all([
        apiClient.get(`/api/files${query}`, {
          headers: authHeaders(),
        }),
        apiClient.get(`/api/folders${query}`, {
          headers: authHeaders(),
        }),
      ]);

      setFiles(filesRes.data.files || []);
      setFolders(foldersRes.data.folders || []);
    } catch (error) {
      if (handleAuthError(error)) return;

      const message = error.response?.data?.message || "Failed to load files.";

      setError(message);
      toast.error("Load failed", message);
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, toast]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleSelectedFiles = async (selectedFiles, targetFolderId = null) => {
    const fileList = Array.from(selectedFiles || []);

    if (fileList.length === 0) return;

    if (targetFolderId) {
      await uploadFilesToTarget(fileList, targetFolderId);
      return;
    }

    if (currentFolderId) {
      await uploadFilesToTarget(fileList, currentFolderId);
      return;
    }

    setPendingUploadFiles(fileList);
    setShowDestinationModal(true);
  };

  const uploadFilesToTarget = async (fileList, targetFolderId = null) => {
    const queueItems = fileList.map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      name: file.name,
      size: file.size,
      progress: 0,
      status: "pending",
      message: "Waiting...",
    }));

    setUploadQueue((prev) => [...queueItems, ...prev]);

    for (let index = 0; index < fileList.length; index++) {
      await uploadSingleFile(
        fileList[index],
        queueItems[index].id,
        targetFolderId
      );
    }

    await loadItems();
  };

  const uploadSingleFile = async (file, queueId, targetFolderId = null) => {
    try {
      updateQueueItem(queueId, {
        status: "uploading",
        message: "Uploading...",
        progress: 3,
      });

      const formData = new FormData();
      formData.append("file", file);

      if (targetFolderId) {
        formData.append("parentFolderId", targetFolderId);
      } else if (currentFolderId) {
        formData.append("parentFolderId", currentFolderId);
      }

      await apiClient.post("/api/files/upload", formData, {
        headers: {
          ...authHeaders(),
        },
        onUploadProgress: (event) => {
          if (!event.total) return;

          const percent = Math.round((event.loaded * 100) / event.total);

          updateQueueItem(queueId, {
            progress: percent,
          });
        },
      });

      updateQueueItem(queueId, {
        status: "success",
        message: "Uploaded",
        progress: 100,
      });

      toast.success("File uploaded", `${file.name} uploaded successfully`);
    } catch (error) {
      if (handleAuthError(error)) return;

      const message = error.response?.data?.message || "Upload failed";

      updateQueueItem(queueId, {
        status: "error",
        message,
        progress: 100,
      });

      toast.error("Upload failed", message);
    }
  };

  const updateQueueItem = (id, updates) => {
    setUploadQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const clearCompletedUploads = () => {
    setUploadQueue((prev) => prev.filter((item) => item.status !== "success"));
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.currentTarget === event.target) {
      setDragActive(false);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    await handleSelectedFiles(event.dataTransfer.files);
  };

  const createFolder = async (event) => {
    event.preventDefault();

    if (!folderName.trim()) return;

    const cleanFolderName = folderName.trim();

    try {
      setCreatingFolder(true);
      setError("");

      const payload = {
        name: cleanFolderName,
      };

      if (currentFolderId) {
        payload.parentFolderId = currentFolderId;
      }

      await apiClient.post("/api/folders", payload, {
        headers: authHeaders(),
      });

      toast.success("Folder created", `${cleanFolderName} created successfully`);

      setFolderName("");
      await loadItems();
    } catch (error) {
      if (handleAuthError(error)) return;

      const message =
        error.response?.data?.message || "Failed to create folder.";

      setError(message);
      toast.error("Folder creation failed", message);
    } finally {
      setCreatingFolder(false);
    }
  };

  const openFolder = (folder) => {
    setBreadcrumb((prev) => [
      ...prev,
      {
        id: folder.id,
        name: folder.name,
      },
    ]);
  };

  const goToBreadcrumb = (index) => {
    setBreadcrumb((prev) => prev.slice(0, index + 1));
  };

  const renameItem = (item, type) => {
    setRenameModal({
      open: true,
      item,
      type,
    });
  };

  const submitRename = async (newName) => {
    const item = renameModal.item;
    const type = renameModal.type;

    if (!item || !type) return;

    const cleanName = newName.trim();

    try {
      setActionLoadingId(item.id);
      setError("");

      if (type === "folder") {
        await apiClient.patch(
          `/api/folders/${item.id}`,
          {
            name: cleanName,
          },
          {
            headers: authHeaders(),
          }
        );

        setBreadcrumb((prev) =>
          prev.map((crumb) =>
            crumb.id === item.id ? { ...crumb, name: cleanName } : crumb
          )
        );
      } else {
        await apiClient.patch(
          `/api/files/${item.id}`,
          {
            name: cleanName,
          },
          {
            headers: authHeaders(),
          }
        );
      }

      toast.success(
        `${type === "folder" ? "Folder" : "File"} renamed`,
        `${item.name} renamed to ${cleanName}`
      );

      setRenameModal({
        open: false,
        item: null,
        type: "",
      });

      await loadItems();
    } catch (error) {
      if (handleAuthError(error)) return;

      const message =
        error.response?.data?.message || `Failed to rename ${type}.`;

      setError(message);
      toast.error("Rename failed", message);
    } finally {
      setActionLoadingId("");
    }
  };

  const deleteItem = (item, type) => {
    setDeleteModal({
      open: true,
      item,
      type,
    });
  };

  const confirmDelete = async () => {
    const item = deleteModal.item;
    const type = deleteModal.type;

    if (!item || !type) return;

    try {
      setActionLoadingId(item.id);
      setError("");

      if (type === "folder") {
        await apiClient.delete(`/api/folders/${item.id}`, {
          headers: authHeaders(),
        });
      } else {
        await apiClient.delete(`/api/files/${item.id}`, {
          headers: authHeaders(),
        });
      }

      toast.success(
        `${type === "folder" ? "Folder" : "File"} deleted`,
        `${item.name} moved to trash`
      );

      setDeleteModal({
        open: false,
        item: null,
        type: "",
      });

      await loadItems();
    } catch (error) {
      if (handleAuthError(error)) return;

      const message =
        error.response?.data?.message || `Failed to delete ${type}.`;

      setError(message);
      toast.error("Delete failed", message);
    } finally {
      setActionLoadingId("");
    }
  };

  const downloadFile = async (file) => {
    try {
      setActionLoadingId(file.id);
      setError("");

      const response = await apiClient.get(`/api/files/${file.id}/download`, {
        headers: authHeaders(),
        responseType: "blob",
      });

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      toast.success("Download started", file.name);
    } catch (error) {
      if (handleAuthError(error)) return;

      const message =
        error.response?.data?.message || "Failed to download file.";

      setError(message);
      toast.error("Download failed", message);
    } finally {
      setActionLoadingId("");
    }
  };

  const closeDestinationModal = () => {
    setShowDestinationModal(false);
    setPendingUploadFiles([]);
    setNewUploadFolderName("");
  };

  const uploadPendingToCurrentLocation = async () => {
    const filesToUpload = [...pendingUploadFiles];

    closeDestinationModal();

    await uploadFilesToTarget(filesToUpload, currentFolderId);
  };

  const uploadPendingToFolder = async (folderId) => {
    const filesToUpload = [...pendingUploadFiles];

    closeDestinationModal();

    await uploadFilesToTarget(filesToUpload, folderId);
  };

  const createFolderAndUploadPending = async () => {
    if (!newUploadFolderName.trim()) return;

    const cleanFolderName = newUploadFolderName.trim();

    try {
      setCreatingUploadFolder(true);
      setError("");

      const payload = {
        name: cleanFolderName,
      };

      if (currentFolderId) {
        payload.parentFolderId = currentFolderId;
      }

      const response = await apiClient.post("/api/folders", payload, {
        headers: authHeaders(),
      });

      const createdFolder = response.data.folder;
      const filesToUpload = [...pendingUploadFiles];

      toast.success("Folder created", `${cleanFolderName} created successfully`);

      closeDestinationModal();

      await uploadFilesToTarget(filesToUpload, createdFolder.id);
      await loadItems();
    } catch (error) {
      if (handleAuthError(error)) return;

      const message =
        error.response?.data?.message || "Failed to create folder.";

      setError(message);
      toast.error("Folder creation failed", message);
    } finally {
      setCreatingUploadFolder(false);
    }
  };

  const filteredFolders = sortItems(
    folders.filter((folder) =>
      folder.name.toLowerCase().includes(search.toLowerCase())
    ),
    sortBy
  );

  const filteredFiles = sortItems(
    files.filter((file) =>
      file.name.toLowerCase().includes(search.toLowerCase())
    ),
    sortBy
  );

  return (
    <>
      <RenameModal
        open={renameModal.open}
        title={`Rename ${renameModal.type || "item"}`}
        initialValue={renameModal.item?.name || ""}
        loading={Boolean(actionLoadingId)}
        onClose={() =>
          setRenameModal({
            open: false,
            item: null,
            type: "",
          })
        }
        onSubmit={submitRename}
      />

      <ConfirmModal
        open={deleteModal.open}
        title={`Delete ${deleteModal.type || "item"}?`}
        message={
          deleteModal.item
            ? `${deleteModal.item.name} will be moved to trash.`
            : "This item will be moved to trash."
        }
        confirmText="Delete"
        danger
        loading={Boolean(actionLoadingId)}
        onClose={() =>
          setDeleteModal({
            open: false,
            item: null,
            type: "",
          })
        }
        onConfirm={confirmDelete}
      />

      <section className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
        <button
          onClick={openFilePicker}
          className="rounded-xl bg-blue-600 px-5 py-3 font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2"
        >
          <UploadCloud size={19} />
          Upload Files
        </button>

        <button
          onClick={loadItems}
          disabled={loading}
          className="rounded-xl border border-white/15 px-5 py-3 font-bold hover:bg-white/10 transition flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </section>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-red-200 flex items-start justify-between gap-4">
          <span>{error}</span>
          <button onClick={() => setError("")}>
            <X size={18} />
          </button>
        </div>
      )}

      {showDestinationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeDestinationModal}
          />

          <div className="relative w-full max-w-2xl rounded-[2rem] border border-white/10 bg-[#111b2a] p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-5 mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold">
                  Choose upload destination
                </h2>
                <p className="text-white/50 mt-2">
                  Select a folder, create a new one, or skip and upload here.
                </p>
              </div>

              <button
                onClick={closeDestinationModal}
                className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="rounded-2xl bg-black/20 border border-white/10 p-4 mb-5">
              <p className="text-white/45 text-sm">Files selected</p>
              <p className="font-bold mt-1">
                {pendingUploadFiles.length} file(s)
              </p>
            </div>

            <div className="grid gap-3 mb-6">
              <button
                onClick={uploadPendingToCurrentLocation}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-left hover:bg-white/10"
              >
                <p className="font-bold">Skip folder selection</p>
                <p className="text-white/45 text-sm mt-1">
                  Upload directly into {currentFolder.name}
                </p>
              </button>

              {folders.length > 0 && (
                <div className="grid sm:grid-cols-2 gap-3">
                  {folders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => uploadPendingToFolder(folder.id)}
                      className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-left hover:bg-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <Folder size={22} className="text-yellow-300" />
                        <div className="min-w-0">
                          <p className="font-bold truncate">{folder.name}</p>
                          <p className="text-white/40 text-sm">Upload here</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
              <p className="font-bold mb-3">Create folder and upload</p>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  value={newUploadFolderName}
                  onChange={(event) =>
                    setNewUploadFolderName(event.target.value)
                  }
                  placeholder="Folder name"
                  className="flex-1 rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:border-blue-500"
                />

                <button
                  onClick={createFolderAndUploadPending}
                  disabled={creatingUploadFolder || !newUploadFolderName.trim()}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-bold hover:bg-blue-700 disabled:opacity-60"
                >
                  {creatingUploadFolder ? "Creating..." : "Create & Upload"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <section
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`mb-6 rounded-3xl border-2 border-dashed p-5 sm:p-7 transition ${
          dragActive
            ? "border-blue-400 bg-blue-500/15"
            : "border-white/15 bg-white/[0.06]"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            handleSelectedFiles(event.target.files);
            event.target.value = "";
          }}
        />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 shrink-0 rounded-2xl bg-blue-500/15 border border-blue-400/20 flex items-center justify-center text-blue-300">
              <UploadCloud size={28} />
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-bold">Drop files here</h2>
              <p className="text-white/55 mt-2 max-w-2xl leading-7">
                {currentFolderId ? (
                  <>
                    Upload directly into{" "}
                    <span className="text-blue-300 font-semibold">
                      {currentFolder.name}
                    </span>
                    . You can also drag files onto any folder card.
                  </>
                ) : (
                  <>
                    Drop files here and choose a folder, create a new folder, or
                    skip folder selection.
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={openFilePicker}
            className="rounded-xl bg-white text-blue-700 px-5 py-3 font-bold hover:bg-blue-50 transition"
          >
            Browse Files
          </button>
        </div>
      </section>

      {uploadQueue.length > 0 && (
        <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.06] p-5">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="text-lg font-bold">Upload Queue</h3>
              <p className="text-white/45 text-sm">
                Track every file upload in real time.
              </p>
            </div>

            <button
              onClick={clearCompletedUploads}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
            >
              Clear completed
            </button>
          </div>

          <div className="grid gap-3">
            {uploadQueue.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-black/20 border border-white/10 p-4"
              >
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{item.name}</p>
                    <p className="text-white/45 text-sm">
                      {formatBytes(item.size)} • {item.message}
                    </p>
                  </div>

                  <StatusBadge status={item.status} />
                </div>

                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      item.status === "error"
                        ? "bg-red-500"
                        : item.status === "success"
                        ? "bg-green-500"
                        : "bg-blue-500"
                    }`}
                    style={{
                      width: `${item.progress}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* <section className="grid lg:grid-cols-[1fr_320px] gap-5"> */}
      <section className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_320px] gap-5">
        {/* <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5"> */}
        <div className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.06] p-5">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5 mb-6">
            <div className="flex flex-wrap items-center gap-2 text-sm text-white/55">
              {breadcrumb.map((crumb, index) => (
                <div
                  key={`${crumb.id}-${index}`}
                  className="flex items-center gap-2"
                >
                  <button
                    onClick={() => goToBreadcrumb(index)}
                    className={`hover:text-white ${
                      index === breadcrumb.length - 1
                        ? "text-blue-300 font-bold"
                        : ""
                    }`}
                  >
                    {index === 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Home size={15} />
                        {crumb.name}
                      </span>
                    ) : (
                      crumb.name
                    )}
                  </button>

                  {index !== breadcrumb.length - 1 && (
                    <ChevronRight size={15} className="text-white/30" />
                  )}
                </div>
              ))}
            </div>

            <FileToolbar
              viewMode={viewMode}
              setViewMode={setViewMode}
              sortBy={sortBy}
              setSortBy={setSortBy}
              search={search}
              setSearch={setSearch}
            />
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[210px] rounded-2xl bg-white/5 border border-white/10 animate-pulse"
                />
              ))}
            </div>
          ) : filteredFolders.length === 0 && filteredFiles.length === 0 ? (
            <EmptyState onUpload={openFilePicker} />
          ) : (
            <div className="space-y-8">
              <section>
                <SectionHeader title="Folders" count={filteredFolders.length} />

                {filteredFolders.length > 0 ? (
                  <div
                    className={
                      viewMode === "grid"
                        ? "grid sm:grid-cols-2 xl:grid-cols-3 gap-4"
                        : "space-y-3"
                    }
                  >
                    {filteredFolders.map((folder) =>
                      viewMode === "grid" ? (
                        <VaultCard
                          key={folder.id}
                          item={folder}
                          type="folder"
                          loading={actionLoadingId === folder.id}
                          onOpen={() => openFolder(folder)}
                          onRename={() => renameItem(folder, "folder")}
                          onDelete={() => deleteItem(folder, "folder")}
                          onDropFiles={(droppedFiles) =>
                            handleSelectedFiles(droppedFiles, folder.id)
                          }
                        />
                      ) : (
                        <VaultListRow
                          key={folder.id}
                          item={folder}
                          type="folder"
                          loading={actionLoadingId === folder.id}
                          onOpen={() => openFolder(folder)}
                          onRename={() => renameItem(folder, "folder")}
                          onDelete={() => deleteItem(folder, "folder")}
                          onDropFiles={(droppedFiles) =>
                            handleSelectedFiles(droppedFiles, folder.id)
                          }
                        />
                      )
                    )}
                  </div>
                ) : (
                  <EmptySection text="No folders in this location." />
                )}
              </section>

              <section>
                <SectionHeader title="Files" count={filteredFiles.length} />

                {filteredFiles.length > 0 ? (
                  <div
                    className={
                      viewMode === "grid"
                        ? "grid sm:grid-cols-2 xl:grid-cols-3 gap-4"
                        : "space-y-3"
                    }
                  >
                    {filteredFiles.map((file) =>
                      viewMode === "grid" ? (
                        <VaultCard
                          key={file.id}
                          item={file}
                          type="file"
                          loading={actionLoadingId === file.id}
                          onDownload={() => downloadFile(file)}
                          onRename={() => renameItem(file, "file")}
                          onDelete={() => deleteItem(file, "file")}
                        />
                      ) : (
                        <VaultListRow
                          key={file.id}
                          item={file}
                          type="file"
                          loading={actionLoadingId === file.id}
                          onDownload={() => downloadFile(file)}
                          onRename={() => renameItem(file, "file")}
                          onDelete={() => deleteItem(file, "file")}
                        />
                      )
                    )}
                  </div>
                ) : (
                  <EmptySection text="No files in this location." />
                )}
              </section>
            </div>
          )}
        </div>

        <aside className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 h-fit">
          <h3 className="text-lg font-bold mb-2">Quick Actions</h3>
          <p className="text-white/45 text-sm mb-5">
            Create folders and upload into your current vault location.
          </p>

          <form onSubmit={createFolder} className="space-y-3 mb-6">
            <input
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              placeholder="New folder name"
              className="w-full rounded-xl bg-black/25 border border-white/10 px-4 py-3 outline-none focus:border-blue-500"
            />

            <button
              type="submit"
              disabled={creatingFolder || !folderName.trim()}
              className="w-full rounded-xl bg-blue-600 px-5 py-3 font-bold hover:bg-blue-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {creatingFolder ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <FolderPlus size={19} />
              )}
              Create Folder
            </button>
          </form>

          <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
            <p className="text-white/45 text-sm">Current location</p>
            <p className="font-bold mt-2 truncate">{currentFolder.name}</p>
            <p className="text-white/35 text-xs mt-2">
              {currentFolderId
                ? "Dropped files upload here automatically."
                : "At root, upload will ask where to store the file."}
            </p>
          </div>
        </aside>
      </section>
    </>
  );
}

function FileToolbar({
  viewMode,
  setViewMode,
  sortBy,
  setSortBy,
  search,
  setSearch,
}) {
  return (
    <div className="w-full min-w-0 flex flex-col xl:flex-row xl:items-center gap-3">
      <div className="flex items-center rounded-2xl border border-white/10 bg-black/25 p-1.5 w-full sm:w-fit shrink-0">
        <button
          onClick={() => setViewMode("grid")}
          className={`h-11 flex-1 sm:flex-none px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition ${
            viewMode === "grid"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
              : "text-white/50 hover:text-white hover:bg-white/10"
          }`}
          title="Grid view"
        >
          <Grid2X2 size={18} />
          Grid
        </button>

        <button
          onClick={() => setViewMode("list")}
          className={`h-11 flex-1 sm:flex-none px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition ${
            viewMode === "list"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
              : "text-white/50 hover:text-white hover:bg-white/10"
          }`}
          title="List view"
        >
          <List size={19} />
          List
        </button>
      </div>

      <div className="relative w-full xl:w-48 shrink-0">
        <SlidersHorizontal
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300"
        />

        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          className="h-12 w-full rounded-2xl bg-black/25 border border-white/10 pl-12 pr-10 outline-none focus:border-blue-500 text-white font-semibold appearance-none"
        >
          <option value="name" className="bg-[#111b2a]">
            Sort by name
          </option>
          <option value="newest" className="bg-[#111b2a]">
            Sort by newest
          </option>
          <option value="size" className="bg-[#111b2a]">
            Sort by size
          </option>
        </select>

        <ArrowUpDown
          size={15}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none"
        />
      </div>

      <div className="relative w-full xl:w-72 2xl:w-96 min-w-0">
        <Search
          size={19}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300"
        />

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search files and folders..."
          className="h-12 w-full rounded-2xl bg-black/25 border border-white/10 pl-12 pr-4 outline-none focus:border-blue-500 font-semibold placeholder:text-white/35"
        />
      </div>
    </div>
  );
}
function StatusBadge({ status }) {
  const className =
    status === "success"
      ? "bg-green-500/15 text-green-300"
      : status === "error"
      ? "bg-red-500/15 text-red-300"
      : status === "uploading"
      ? "bg-blue-500/15 text-blue-300"
      : "bg-white/10 text-white/60";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${className}`}>
      {status}
    </span>
  );
}

function VaultCard({
  item,
  type,
  loading,
  onOpen,
  onDownload,
  onRename,
  onDelete,
  onDropFiles,
}) {
  const isFolder = type === "folder";
  const [dragOverFolder, setDragOverFolder] = useState(false);

  const handleFolderDragOver = (event) => {
    if (!isFolder) return;

    event.preventDefault();
    event.stopPropagation();
    setDragOverFolder(true);
  };

  const handleFolderDragLeave = (event) => {
    if (!isFolder) return;

    event.preventDefault();
    event.stopPropagation();
    setDragOverFolder(false);
  };

  const handleFolderDrop = (event) => {
    if (!isFolder) return;

    event.preventDefault();
    event.stopPropagation();
    setDragOverFolder(false);

    const droppedFiles = event.dataTransfer.files;

    if (droppedFiles?.length && onDropFiles) {
      onDropFiles(droppedFiles);
    }
  };

  return (
    <div
      onDragOver={handleFolderDragOver}
      onDragLeave={handleFolderDragLeave}
      onDrop={handleFolderDrop}
      className={`group min-h-[210px] rounded-2xl border p-3 transition flex flex-col ${
        dragOverFolder
          ? "bg-blue-500/15 border-blue-400"
          : "bg-black/20 border-white/10 hover:bg-white/[0.08]"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <button
          onClick={isFolder ? onOpen : undefined}
          className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
            isFolder
              ? "bg-yellow-500/15 text-yellow-300"
              : "bg-blue-500/15 text-blue-300"
          }`}
        >
          {isFolder ? <Folder size={22} /> : <FileText size={22} />}
        </button>

        <div className="h-5 w-5 flex items-center justify-center">
          {loading && (
            <Loader2 size={20} className="animate-spin text-white/50" />
          )}
        </div>
      </div>

      <div className="flex-1">
        <button
          onClick={isFolder ? onOpen : undefined}
          className={`text-left w-full ${
            isFolder ? "hover:text-blue-300" : ""
          }`}
        >
          <h3 className="font-bold text-[15px] truncate min-h-[22px]">
            {item.name}
          </h3>
        </button>

        <p className="text-white/40 text-sm mt-2 min-h-[20px] truncate">
          {isFolder
            ? "Folder"
            : item.size
            ? `${formatBytes(item.size)} • ${item.mimeType || "File"}`
            : item.mimeType || "File"}
        </p>

        <div className="min-h-[28px] mt-2">
          {isFolder && (
            <p className="text-blue-300/70 text-xs leading-5">
              Drop files here to upload into this folder
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-auto pt-3">
        {!isFolder ? (
          <button
            onClick={onDownload}
            className="h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center"
            title="Download"
          >
            <Download size={16} />
          </button>
        ) : (
          <button
            onClick={onOpen}
            className="h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center"
            title="Open"
          >
            <ChevronRight size={16} />
          </button>
        )}

        <button
          onClick={onRename}
          className="h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center"
          title="Rename"
        >
          <Pencil size={16} />
        </button>

        <button
          onClick={onDelete}
          className="h-10 rounded-xl bg-red-500/10 border border-red-400/20 hover:bg-red-500/20 text-red-200 flex items-center justify-center"
          title="Delete"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function VaultListRow({
  item,
  type,
  loading,
  onOpen,
  onDownload,
  onRename,
  onDelete,
  onDropFiles,
}) {
  const isFolder = type === "folder";
  const [dragOverFolder, setDragOverFolder] = useState(false);

  const handleFolderDragOver = (event) => {
    if (!isFolder) return;

    event.preventDefault();
    event.stopPropagation();
    setDragOverFolder(true);
  };

  const handleFolderDragLeave = (event) => {
    if (!isFolder) return;

    event.preventDefault();
    event.stopPropagation();
    setDragOverFolder(false);
  };

  const handleFolderDrop = (event) => {
    if (!isFolder) return;

    event.preventDefault();
    event.stopPropagation();
    setDragOverFolder(false);

    const droppedFiles = event.dataTransfer.files;

    if (droppedFiles?.length && onDropFiles) {
      onDropFiles(droppedFiles);
    }
  };

  return (
    <div
      onDragOver={handleFolderDragOver}
      onDragLeave={handleFolderDragLeave}
      onDrop={handleFolderDrop}
      className={`rounded-2xl border p-4 transition ${
        dragOverFolder
          ? "bg-blue-500/15 border-blue-400"
          : "bg-black/20 border-white/10 hover:bg-white/[0.08]"
      }`}
    >
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={isFolder ? onOpen : undefined}
            className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${
              isFolder
                ? "bg-yellow-500/15 text-yellow-300"
                : "bg-blue-500/15 text-blue-300"
            }`}
          >
            {isFolder ? <Folder size={24} /> : <FileText size={24} />}
          </button>

          <div className="min-w-0">
            <button
              onClick={isFolder ? onOpen : undefined}
              className={`text-left w-full ${
                isFolder ? "hover:text-blue-300" : ""
              }`}
            >
              <h3 className="font-bold truncate">{item.name}</h3>
            </button>

            <p className="text-white/40 text-sm mt-1 truncate">
              {isFolder
                ? "Folder"
                : item.size
                ? `${formatBytes(item.size)} • ${item.mimeType || "File"}`
                : item.mimeType || "File"}
            </p>

            {isFolder && (
              <p className="text-blue-300/70 text-xs mt-1">
                Drop files here to upload into this folder
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 xl:w-56">
          {!isFolder ? (
            <button
              onClick={onDownload}
              className="h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center"
              title="Download"
            >
              <Download size={16} />
            </button>
          ) : (
            <button
              onClick={onOpen}
              className="h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center"
              title="Open"
            >
              <ChevronRight size={16} />
            </button>
          )}

          <button
            onClick={onRename}
            className="h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center"
            title="Rename"
          >
            <Pencil size={16} />
          </button>

          <button
            onClick={onDelete}
            className="h-10 rounded-xl bg-red-500/10 border border-red-400/20 hover:bg-red-500/20 text-red-200 flex items-center justify-center"
            title="Delete"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, count }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <div>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="text-white/40 text-sm">
          {count} {count === 1 ? "item" : "items"}
        </p>
      </div>
    </div>
  );
}

function EmptySection({ text }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white/45 text-sm">
      {text}
    </div>
  );
}

function EmptyState({ onUpload }) {
  return (
    <div className="col-span-full rounded-3xl border border-white/10 bg-black/20 p-8 text-center">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-blue-500/15 border border-blue-400/20 flex items-center justify-center text-blue-300 mb-5">
        <UploadCloud size={28} />
      </div>

      <h3 className="text-xl font-bold">Nothing here yet</h3>

      <p className="text-white/50 mt-3 max-w-md mx-auto">
        Drop files into this area, choose a folder destination, or create a
        folder to organize your vault.
      </p>

      <button
        onClick={onUpload}
        className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-bold hover:bg-blue-700"
      >
        Upload Files
      </button>
    </div>
  );
}