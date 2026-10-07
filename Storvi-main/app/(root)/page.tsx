import DashboardChart from "@/components/DashboardChart";
import FormattedDateTime from "@/components/FormattedDateTime";
import ActionDropdown from "@/components/ActionDropdown";
import Thumbnail from "@/components/Thumbnail";
import { getFiles } from "@/lib/actions/file.actions";
import {
    constructFileUrl,
    convertFileSize,
    getUsageSummary,
} from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { Models } from "node-appwrite";

export const dynamic = "force-dynamic";

const initialTotalSpace = {
    document: { size: 0, latestDate: "" },
    image: { size: 0, latestDate: "" },
    video: { size: 0, latestDate: "" },
    audio: { size: 0, latestDate: "" },
    other: { size: 0, latestDate: "" },
};

export default async function Home() {
    const files = await getFiles({
        types: [],
        sort: "$createdAt-desc",
        limit: 100,
    });

    const documents = files.documents as Models.Document[];
    const totalSpace = documents.reduce((acc, file) => {
        const type = file.type as FileType;

        acc[type].size += file.size;

        if (file.$createdAt > acc[type].latestDate) {
            acc[type].latestDate = file.$createdAt;
        }

        return acc;
    }, structuredClone(initialTotalSpace));

    const usedStorage = documents.reduce((total, file) => total + file.size, 0);
    const usageSummary = getUsageSummary(totalSpace);
    const recentFiles = documents.slice(0, 10);

    return (
        <div className="dashboard-container">
            <section>
                <DashboardChart usedStorage={usedStorage} />

                <ul className="dashboard-summary-list">
                    {usageSummary.map((summary) => (
                        <Link href={summary.url} key={summary.title}>
                            <li className="dashboard-summary-card">
                                <Image
                                    src={summary.icon}
                                    alt={summary.title}
                                    width={190}
                                    height={160}
                                    className="summary-type-icon"
                                />
                                <p className="summary-type-size">
                                    {convertFileSize(summary.size)}
                                </p>
                                <h2 className="summary-type-title">
                                    {summary.title}
                                </h2>
                                {summary.latestDate ? (
                                    <div className="mt-2 flex justify-center gap-1">
                                        <p className="caption text-light-200">
                                            Last upload:
                                        </p>
                                        <FormattedDateTime
                                            date={summary.latestDate}
                                            className="caption text-light-200"
                                        />
                                    </div>
                                ) : (
                                    <p className="caption mt-2 text-center text-light-200">
                                        No files yet
                                    </p>
                                )}
                            </li>
                        </Link>
                    ))}
                </ul>
            </section>

            <aside className="dashboard-recent-files">
                <h2 className="h3 text-light-100">Recent files uploaded</h2>

                {recentFiles.length > 0 ? (
                    <ul className="mt-5 flex flex-col gap-5">
                        {recentFiles.map((file) => {
                            const fileUrl = constructFileUrl(file.bucketFileId);

                            return (
                                <li
                                    key={file.$id}
                                    className="recent-file-details gap-3"
                                >
                                    <Link
                                        href={fileUrl}
                                        target="_blank"
                                        className="flex min-w-0 flex-1 items-center gap-3"
                                    >
                                        <Thumbnail
                                            type={file.type}
                                            extension={file.extension}
                                            url={fileUrl}
                                            className="size-11 min-w-11"
                                            imageClassName="size-8"
                                        />
                                        <div className="min-w-0">
                                            <p className="recent-file-name">
                                                {file.name}
                                            </p>
                                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                                <FormattedDateTime
                                                    date={file.$createdAt}
                                                    className="recent-file-date"
                                                />
                                                <span className="size-1 rounded-full bg-light-200" />
                                                <p className="caption text-light-200">
                                                    {convertFileSize(file.size)}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>

                                    <div className="flex min-w-fit items-center">
                                        <ActionDropdown file={file} />
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="empty-list">No files uploaded</p>
                )}
            </aside>
        </div>
    );
}
