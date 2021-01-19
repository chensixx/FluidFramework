/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { IChannelStorageService } from "@fluidframework/datastore-definitions";
import { stringToBuffer } from "@fluidframework/common-utils";
import { IBlob, ITree, TreeEntry } from "@fluidframework/protocol-definitions";
import { listBlobsAtTreePath } from "@fluidframework/runtime-utils";

export class LocalChannelStorageService implements IChannelStorageService {
    constructor(private readonly tree: ITree) {
    }

    public async read(path: string): Promise<string> {
        const blob = this.readBlobSyncInternal(path, this.tree);
        return blob !== undefined ? Promise.resolve(blob.contents) : Promise.reject(new Error("Not found"));
    }

    public async readBlob(path: string): Promise<ArrayBufferLike> {
        const blob = this.readBlobSyncInternal(path, this.tree);
        return blob !== undefined ? stringToBuffer(blob.contents, blob.encoding) :
            Promise.reject(new Error("Not found"));
    }

    public async contains(path: string): Promise<boolean> {
        const blob = this.readBlobSyncInternal(path, this.tree);
        return blob !== undefined ? blob.contents !== undefined : false;
    }

    public async list(path: string): Promise<string[]> {
        return listBlobsAtTreePath(this.tree, path);
    }

    private readBlobSyncInternal(path: string, tree: ITree): IBlob | undefined {
        for (const entry of tree.entries) {
            switch (entry.type) {
                case TreeEntry.Blob:
                    if (path === entry.path) {
                        return entry.value as IBlob;
                    }
                    break;

                case TreeEntry.Tree:
                    if (path.startsWith(entry.path)) {
                        return this.readBlobSyncInternal(path.substr(entry.path.length + 1), entry.value as ITree);
                    }
                    break;

                default:
            }
        }

        return undefined;
    }
}
