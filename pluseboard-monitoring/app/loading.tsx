export default function Loading() {
  return (
    <div className="page-shell py-10">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="skeleton h-28 rounded-[24px]" />
        <div className="skeleton h-28 rounded-[24px]" />
        <div className="skeleton h-28 rounded-[24px]" />
        <div className="skeleton h-28 rounded-[24px]" />
      </div>
    </div>
  );
}
