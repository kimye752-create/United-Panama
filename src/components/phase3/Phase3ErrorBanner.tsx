interface Phase3ErrorBannerProps {
  message: string;
}

/** API·네트워크 오류 표시 */
export function Phase3ErrorBanner({ message }: Phase3ErrorBannerProps) {
  return (
    <div className="rounded-[10px] border border-[#f5c2c2] bg-[#fef2f2] p-3 text-[12px] text-[#991b1b]">
      {message}
    </div>
  );
}
