/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { IChannelStorageService } from "@fluidframework/datastore-definitions";
import { assert, fromBase64ToUtf8, fromUtf8ToBase64 } from "@fluidframework/common-utils";
import { IBlob, ITree, TreeEntry } from "@fluidframework/protocol-definitions";
import { listBlobsAtTreePath } from "@fluidframework/runtime-utils";

export class LocalChannelStorageService implements IChannelStorageService {
    constructor(private readonly tree: ITree) {
    }

    public async read(path: string): Promise<string> {
        const contents = this.readSync(path);
        assert(contents !== undefined, "Not Found");
        return contents;
    }

    public async readString(path: string): Promise<string> {
        const contents = this.readStringSync(path);
        assert(contents !== undefined, "Not Found");
        return contents;
    }

    public async contains(path: string): Promise<boolean> {
        const contents = this.readSync(path);
        return contents !== undefined;
    }

    public async list(path: string): Promise<string[]> {
        return listBlobsAtTreePath(this.tree, path);
    }

    /**
     * Provides a synchronous access point to locally stored data
     */
    private readSync(path: string): string | undefined {
        return this.readSyncInternal(path, this.tree);
    }

    private readStringSync(path: string): string | undefined {
        return this.readStringSyncInternal(path, this.tree);
    }

    private readSyncInternal(path: string, tree: ITree): string | undefined {
        for (const entry of tree.entries) {
            switch (entry.type) {
                case TreeEntry.Blob:
                    if (path === entry.path) {
                        const blob = entry.value as IBlob;
                        return blob.encoding === "utf-8"
                            ? fromUtf8ToBase64(blob.contents)
                            : blob.contents;
                    }
                    break;

                case TreeEntry.Tree:
                    if (path.startsWith(entry.path)) {
                        return this.readSyncInternal(path.substr(entry.path.length + 1), entry.value as ITree);
                    }
                    break;

                default:
            }
        }

        return undefined;
    }

    private readStringSyncInternal(path: string, tree: ITree): string | undefined {
        for (const entry of tree.entries) {
            switch (entry.type) {
                case TreeEntry.Blob:
                    if (path === entry.path) {
                        const blob = entry.value as IBlob;
                        return blob.encoding === "utf-8"
                            ? blob.contents
                            : fromBase64ToUtf8(blob.contents);
                    }
                    break;

                case TreeEntry.Tree:
                    if (path.startsWith(entry.path)) {
                        return this.readStringSyncInternal(path.substr(entry.path.length + 1), entry.value as ITree);
                    }
                    break;

                default:
            }
        }

        return undefined;
    }
}
