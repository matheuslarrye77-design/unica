export default function AuthLayout({
   children,
}: {
   children: React.ReactNode;
}) {
   return (
      <div className="flex min-h-screen font-poppins text-slate-900 bg-white m-0 p-0 w-full">
         {children}
      </div>
   );
}
