import Image from "next/image";

interface AuthHeroPanelProps {
   title: string;
   description: string;
}

export function AuthHeroPanel({
   title,
   description,
}: AuthHeroPanelProps): React.JSX.Element {
   return (
      <div className="relative hidden lg:flex flex-col justify-center items-center overflow-hidden">
         <Image
            src="/auth-banner.png"
            alt=""
            fill
            className="object-cover"
            priority
         />
         <div className="relative z-10 max-w-md space-y-4 text-center p-12">
            <h1 className="text-4xl font-bold tracking-tight text-white">
               {title}
            </h1>
            <p className="text-white/80 text-lg">{description}</p>
         </div>
      </div>
   );
}
