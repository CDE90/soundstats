import Image from "next/image";
import Link from "next/link";
import {
    getPublicUserDisplayName,
    type UserDisplayData,
} from "@/lib/user-display";

export function ListenerContext({
    user,
    isViewer,
}: {
    user?: (UserDisplayData & { imageUrl?: string }) | null;
    isViewer: boolean;
}) {
    const name = getPublicUserDisplayName(user);
    return (
        <div className="ss-listener-context">
            {user?.imageUrl && (
                <Image
                    src={user.imageUrl}
                    width={32}
                    height={32}
                    alt=""
                    className="rounded-full"
                />
            )}
            <span>{isViewer ? "Your listening" : `${name}’s listening`}</span>
            {!isViewer && <Link href="/dashboard">Back to your listening</Link>}
        </div>
    );
}
