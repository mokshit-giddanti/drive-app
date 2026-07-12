"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Download,
  FileText,
  Folder,
  FolderPlus,
  Home,
  Loader2,
  MoreVertical,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import {
  apiClient,
  authHeaders,
  clearAuth,
  formatBytes,
  getToken,
  handleAuthError,
} from "@/lib/api";

export default function FilesPage() {
  const fileInputRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [breadcrumb, setBreadcrumb] = useState([
    {
      id: null,
      name: "Uploads",
    },
  ]);

  const [loading, setLoading] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [folderName, setFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [search, setSearch] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [error, setError] = useState("");

  const [pendingUploadFiles, setPendingUploadFiles] = useState([]);
  const [showDestinationModal, setShowDestinationModal] = useState(false);
  const [newUploadFolderName, setNewUploadFolderName] = useState("");
  const [creatingUploadFolder, setCreatingUploadFolder] = useState(false);

  const currentFolder = breadcrumb[breadcrumb.length - 1];
  const currentFolderId = currentFolder?.id || null;

  const loadItems = async () => {
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
      setError(error.response?.data?.message || "Failed to load files.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [currentFolderId]);

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
      await uploadSingleFile(fileList[index], queueItems[index].id, targetFolderId);
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
    } catch (error) {
      if (handleAuthError(error)) return;

      updateQueueItem(queueId, {
        status: "error",
        message: error.response?.data?.message || "Upload failed",
        progress: 100,
      });
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

    const droppedFiles = event.dataTransfer.files;

    await handleSelectedFiles(droppedFiles);
  };

  const createFolder = async (event) => {
    event.preventDefault();

    if (!folderName.trim()) return;

    try {
      setCreatingFolder(true);
      setError("");

      const payload = {
        name: folderName.trim(),
      };

      if (currentFolderId) {
        payload.parentFolderId = currentFolderId;
      }

      await apiClient.post("/api/folders", payload, {
        headers: authHeaders(),
      });

      setFolderName("");
      await loadItems();
    } catch (error) {
      if (handleAuthError(error)) return;
      setError(error.response?.data?.message || "Failed to create folder.");
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

  const renameItem = async (item, type) => {
    const newName = window.prompt(`Rename ${type}`, item.name);

    if (!newName || !newName.trim() || newName.trim() === item.name) return;

    try {
      setActionLoadingId(item.id);

      if (type === "folder") {
        await apiClient.patch(
          `/api/folders/${item.id}`,
          {
            name: newName.trim(),
          },
          {
            headers: authHeaders(),
          }
        );

        setBreadcrumb((prev) =>
          prev.map((crumb) =>
            crumb.id === item.id ? { ...crumb, name: newName.trim() } : crumb
          )
        );
      } else {
        await apiClient.patch(
          `/api/files/${item.id}`,
          {
            name: newName.trim(),
          },
          {
            headers: authHeaders(),
          }
        );
      }

      await loadItems();
    } catch (error) {
      if (handleAuthError(error)) return;
      setError(error.response?.data?.message || `Failed to rename ${type}.`);
    } finally {
      setActionLoadingId("");
    }
  };

  const deleteItem = async (item, type) => {
    const confirmed = window.confirm(`Delete ${item.name}?`);

    if (!confirmed) return;

    try {
      setActionLoadingId(item.id);

      if (type === "folder") {
        await apiClient.delete(`/api/folders/${item.id}`, {
          headers: authHeaders(),
        });
      } else {
        await apiClient.delete(`/api/files/${item.id}`, {
          headers: authHeaders(),
        });
      }

      await loadItems();
    } catch (error) {
      if (handleAuthError(error)) return;
      setError(error.response?.data?.message || `Failed to delete ${type}.`);
    } finally {
      setActionLoadingId("");
    }
  };

  const downloadFile = async (file) => {
    try {
      setActionLoadingId(file.id);

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
    } catch (error) {
      if (handleAuthError(error)) return;
      setError(error.response?.data?.message || "Failed to download file.");
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

    try {
      setCreatingUploadFolder(true);

      const payload = {
        name: newUploadFolderName.trim(),
      };

      if (currentFolderId) {
        payload.parentFolderId = currentFolderId;
      }

      const response = await apiClient.post("/api/folders", payload, {
        headers: authHeaders(),
      });

      const createdFolder = response.data.folder;
      const filesToUpload = [...pendingUploadFiles];

      closeDestinationModal();

      await uploadFilesToTarget(filesToUpload, createdFolder.id);
      await loadItems();
    } catch (error) {
      if (handleAuthError(error)) return;
      setError(error.response?.data?.message || "Failed to create folder.");
    } finally {
      setCreatingUploadFolder(false);
    }
  };

  const logout = () => {
    clearAuth();
    window.location.href = "/login";
  };

  const filteredFolders = folders.filter((folder) =>
    folder.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-120px] left-[-120px] h-[360px] w-[360px] rounded-full bg-blue-600/15 blur-3xl" />
        <div className="absolute bottom-[-180px] right-[-180px] h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-6 sm:py-8">
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-7">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-white/55 hover:text-white mb-4"
            >
              <ArrowLeft size={18} />
              Back to dashboard
            </Link>

            <h1 className="text-3xl sm:text-5xl font-bold">File Vault</h1>
            <p className="text-white/55 mt-3 max-w-2xl">
              Drag, drop, organize, and manage your Google Drive vault from one
              faster workspace.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={openFilePicker}
              className="rounded-2xl bg-blue-600 px-5 py-3 font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              <UploadCloud size={20} />
              Upload Files
            </button>

            <button
              onClick={loadItems}
              disabled={loading}
              className="rounded-2xl border border-white/15 px-5 py-3 font-bold hover:bg-white/10 transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <RefreshCw size={19} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              onClick={logout}
              className="rounded-2xl border border-red-400/20 bg-red-500/10 px-5 py-3 font-bold text-red-200 hover:bg-red-500/20 transition"
            >
              Logout
            </button>
          </div>
        </header>

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
                            <p className="text-white/40 text-sm">
                              Upload here
                            </p>
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
                    disabled={
                      creatingUploadFolder || !newUploadFolderName.trim()
                    }
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
          className={`mb-7 rounded-[2rem] border-2 border-dashed p-6 sm:p-10 transition ${
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

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-7">
            <div className="flex items-start gap-5">
              <div className="h-16 w-16 shrink-0 rounded-3xl bg-blue-500/15 border border-blue-400/20 flex items-center justify-center text-blue-300">
                <UploadCloud size={32} />
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-bold">
                  Drop files here
                </h2>
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
                      Drop files here and choose a folder, create a new folder,
                      or skip folder selection.
                    </>
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={openFilePicker}
              className="rounded-2xl bg-white text-blue-700 px-6 py-4 font-bold hover:bg-blue-50 transition"
            >
              Browse Files
            </button>
          </div>
        </section>

        {uploadQueue.length > 0 && (
          <section className="mb-7 rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h3 className="text-xl font-bold">Upload Queue</h3>
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

        <section className="grid lg:grid-cols-[1fr_340px] gap-6">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 sm:p-6">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5 mb-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-white/55 mb-3">
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

                <h2 className="text-2xl font-bold">{currentFolder.name}</h2>
              </div>

              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search files and folders..."
                  className="w-full xl:w-80 rounded-2xl bg-black/25 border border-white/10 pl-11 pr-4 py-3 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {loading ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-40 rounded-3xl bg-white/5 border border-white/10 animate-pulse"
                  />
                ))}
              </div>
            ) : filteredFolders.length === 0 && filteredFiles.length === 0 ? (
              <EmptyState onUpload={openFilePicker} />
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredFolders.map((folder) => (
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
                ))}

                {filteredFiles.map((file) => (
                  <VaultCard
                    key={file.id}
                    item={file}
                    type="file"
                    loading={actionLoadingId === file.id}
                    onDownload={() => downloadFile(file)}
                    onRename={() => renameItem(file, "file")}
                    onDelete={() => deleteItem(file, "file")}
                  />
                ))}
              </div>
            )}
          </div>

          <aside className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 sm:p-6 h-fit">
            <h3 className="text-xl font-bold mb-2">Quick Actions</h3>
            <p className="text-white/45 text-sm mb-5">
              Create folders and upload into your current vault location.
            </p>

            <form onSubmit={createFolder} className="space-y-3 mb-6">
              <input
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
                placeholder="New folder name"
                className="w-full rounded-2xl bg-black/25 border border-white/10 px-4 py-3 outline-none focus:border-blue-500"
              />

              <button
                type="submit"
                disabled={creatingFolder || !folderName.trim()}
                className="w-full rounded-2xl bg-blue-600 px-5 py-3 font-bold hover:bg-blue-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
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
      </div>
    </main>
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
      className={`group rounded-3xl border p-5 transition ${
        dragOverFolder
          ? "bg-blue-500/15 border-blue-400"
          : "bg-black/20 border-white/10 hover:bg-white/[0.08]"
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-5">
        <button
          onClick={isFolder ? onOpen : undefined}
          className={`h-14 w-14 rounded-2xl flex items-center justify-center ${
            isFolder
              ? "bg-yellow-500/15 text-yellow-300"
              : "bg-blue-500/15 text-blue-300"
          }`}
        >
          {isFolder ? <Folder size={28} /> : <FileText size={28} />}
        </button>

        <div className="relative">
          {loading ? (
            <Loader2 size={20} className="animate-spin text-white/50" />
          ) : (
            <MoreVertical size={20} className="text-white/35" />
          )}
        </div>
      </div>

      <button
        onClick={isFolder ? onOpen : undefined}
        className={`text-left w-full ${isFolder ? "hover:text-blue-300" : ""}`}
      >
        <h3 className="font-bold text-lg truncate">{item.name}</h3>
      </button>

      <p className="text-white/40 text-sm mt-2">
        {isFolder
          ? "Folder"
          : item.size
          ? `${formatBytes(item.size)} • ${item.mimeType || "File"}`
          : item.mimeType || "File"}
      </p>

      {isFolder && (
        <p className="text-blue-300/70 text-xs mt-3">
          Drop files here to upload into this folder
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 mt-5">
        {!isFolder ? (
          <button
            onClick={onDownload}
            className="rounded-xl bg-white/5 border border-white/10 p-3 hover:bg-white/10 flex items-center justify-center"
            title="Download"
          >
            <Download size={17} />
          </button>
        ) : (
          <button
            onClick={onOpen}
            className="rounded-xl bg-white/5 border border-white/10 p-3 hover:bg-white/10 flex items-center justify-center"
            title="Open"
          >
            <ChevronRight size={17} />
          </button>
        )}

        <button
          onClick={onRename}
          className="rounded-xl bg-white/5 border border-white/10 p-3 hover:bg-white/10 flex items-center justify-center"
          title="Rename"
        >
          <Pencil size={17} />
        </button>

        <button
          onClick={onDelete}
          className="rounded-xl bg-red-500/10 border border-red-400/20 p-3 hover:bg-red-500/20 text-red-200 flex items-center justify-center"
          title="Delete"
        >
          <Trash2 size={17} />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onUpload }) {
  return (
    <div className="col-span-full rounded-[2rem] border border-white/10 bg-black/20 p-10 text-center">
      <div className="mx-auto h-16 w-16 rounded-3xl bg-blue-500/15 border border-blue-400/20 flex items-center justify-center text-blue-300 mb-5">
        <UploadCloud size={32} />
      </div>

      <h3 className="text-2xl font-bold">Nothing here yet</h3>

      <p className="text-white/50 mt-3 max-w-md mx-auto">
        Drop files into this area, choose a folder destination, or create a
        folder to organize your vault.
      </p>

      <button
        onClick={onUpload}
        className="mt-6 rounded-2xl bg-blue-600 px-6 py-3 font-bold hover:bg-blue-700"
      >
        Upload Files
      </button>
    </div>
  );
}