import { UploadCloud } from "lucide-react";
import { useRef } from "react";

export default function UploadDropzone({ onFilesSelected }) {
  const inputRef = useRef(null);

  function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (files.length) {
      onFilesSelected(files);
    }
  }

  return (
    <div
      className="upload-dropzone"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        handleFiles(event.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter") inputRef.current?.click();
      }}
    >
      <UploadCloud size={28} />
      <h3>Click or Drag Files Here</h3>
      <p>Supports PDF, CSV, XLSX (multiple files)</p>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={(event) => handleFiles(event.target.files)}
      />
    </div>
  );
}
