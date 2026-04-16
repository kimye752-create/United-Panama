"use client";

interface Phase2UploadAreaProps {
  onMockUpload: () => void;
}

export function Phase2UploadArea({ onMockUpload }: Phase2UploadAreaProps) {
  return (
    <button
      type="button"
      onClick={onMockUpload}
      className="flex h-[64px] w-full items-center justify-center gap-2 rounded-[12px] border border-[#eceff5] bg-[#edf0f6] px-4 text-[20px] font-black text-[#3b5272] shadow-sh3 transition-colors hover:bg-[#e8edf5]"
    >
      <span className="text-[20px]">📄</span>
      <span className="text-[20px] tracking-[-0.02em]">PDF 파일 선택</span>
    </button>
  );
}
