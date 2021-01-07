/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import {
    ISnapshotTree,
    IVersion,
} from "@fluidframework/protocol-definitions";
import { DocumentStorageServiceProxy, bufferToBase64 } from "@fluidframework/driver-utils";
import { debug } from "./debug";

export class PrefetchDocumentStorageService extends DocumentStorageServiceProxy {
    // BlobId -> blob prefetchCache cache
    private readonly prefetchCache = new Map<string, Promise<ArrayBufferLike>>();
    private prefetchEnabled = true;

    public async getSnapshotTree(version?: IVersion): Promise<ISnapshotTree | null> {
        const p = this.internalStorageService.getSnapshotTree(version);
        if (this.prefetchEnabled) {
            // We don't care if the prefetch succeed
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            p.then((tree: ISnapshotTree | null | undefined) => {
                if (tree === null || tree === undefined) { return; }
                this.prefetchTree(tree);
            });
        }
        return p;
    }

    /**
     *
     * @deprecated - only here for back compat, will be removed after release
     */
    public async read(blobId: string): Promise<string> {
        return bufferToBase64(await this.cachedRead(blobId));
    }

    public async readBlob(blobId: string): Promise<ArrayBufferLike > {
        return this.cachedRead(blobId);
    }

    public stopPrefetch() {
        this.prefetchEnabled = false;
        this.prefetchCache.clear();
    }

    // eslint-disable-next-line @typescript-eslint/promise-function-async
    private cachedRead(blobId: string): Promise<ArrayBufferLike> {
        if (this.prefetchEnabled) {
            const prefetchedBlobP: Promise<ArrayBufferLike> | undefined = this.prefetchCache.get(blobId);
            if (prefetchedBlobP !== undefined) {
                return prefetchedBlobP;
            }
            const blob = this.internalStorageService.readBlob(blobId);
            const prefetchedBlobPFromStorage = blob;
            this.prefetchCache.set(blobId, prefetchedBlobPFromStorage);
            return prefetchedBlobPFromStorage;
        }
        return this.internalStorageService.readBlob(blobId);
    }

    private prefetchTree(tree: ISnapshotTree) {
        const secondary: string[] = [];
        this.prefetchTreeCore(tree, secondary);

        for (const blob of secondary) {
            // We don't care if the prefetch succeed
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.cachedRead(blob);
        }
    }

    private prefetchTreeCore(tree: ISnapshotTree, secondary: string[]) {
        for (const blobKey of Object.keys(tree.blobs)) {
            const blob = tree.blobs[blobKey];
            if (blobKey.startsWith(".") || blobKey === "header" || blobKey.startsWith("quorum")) {
                if (blob !== null) {
                    // We don't care if the prefetch succeed
                    // eslint-disable-next-line @typescript-eslint/no-floating-promises
                    this.cachedRead(blob);
                }
            } else if (!blobKey.startsWith("deltas")) {
                if (blob !== null) {
                    secondary.push(blob);
                }
            }
        }

        for (const commit of Object.keys(tree.commits)) {
            this.getVersions(tree.commits[commit], 1)
                // eslint-disable-next-line @typescript-eslint/promise-function-async
                .then((moduleCommit) => this.getSnapshotTree(moduleCommit[0]))
                .catch((error) => debug("Ignored cached read error", error));
        }

        for (const subTree of Object.keys(tree.trees)) {
            this.prefetchTreeCore(tree.trees[subTree], secondary);
        }
    }
}
