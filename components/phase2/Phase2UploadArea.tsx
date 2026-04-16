"use client";

interface Phase2UploadAreaProps {
  onMockUpload: () => void;
}

export function Phase2UploadArea({ onMockUpload }: Phase2UploadAreaProps) {
  return (
    <button
      type="button"
      onClick={onMockUpload}
      className="flex w-full items-center justify-center rounded-[12px] bg-inner px-4 py-6 text-[12px] font-semibold text-muted shadow-sh2 transition-colors hover:bg-navy/10 hover:text-navy"
    >
      PDF 파일 선택 / 드래그
    </button>
  );
}
