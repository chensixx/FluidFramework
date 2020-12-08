/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { IDocumentStorageService } from "@fluidframework/driver-definitions";
import { ISnapshotTree } from "@fluidframework/protocol-definitions";
import { IChannelStorageService } from "@fluidframework/datastore-definitions";
import { getNormalizedObjectStoragePathParts } from "@fluidframework/runtime-utils";
import { fromBase64ToUtf8, IsoBuffer } from "@fluidframework/common-utils";

export class ChannelStorageService implements IChannelStorageService {
    private static flattenTree(base: string, tree: ISnapshotTree, results: { [path: string]: string }) {
        // eslint-disable-next-line guard-for-in, no-restricted-syntax
        for (const path in tree.trees) {
            ChannelStorageService.flattenTree(`${base}${path}/`, tree.trees[path], results);
        }

        // eslint-disable-next-line guard-for-in, no-restricted-syntax
        for (const blob in tree.blobs) {
            results[`${base}${blob}`] = tree.blobs[blob];
        }
    }

    private readonly flattenedTree: { [path: string]: string };

    constructor(
        private readonly tree: ISnapshotTree | undefined,
<<<<<<< HEAD
        private readonly storage: Pick<IDocumentStorageService, "readBlob">,
=======
        private readonly storage: Pick<IDocumentStorageService, "read">,
>>>>>>> main
        private readonly extraBlobs?: Map<string, string>,
    ) {
        this.flattenedTree = {};
        // Create a map from paths to blobs
        if (tree !== undefined) {
             ChannelStorageService.flattenTree("", tree, this.flattenedTree);
        }
    }

    public async contains(path: string): Promise<boolean> {
        return this.flattenedTree[path] !== undefined;
    }

    public async readBlob(path: string): Promise<ArrayBufferLike> {
        const id = await this.getIdForPath(path);
<<<<<<< HEAD
        const blob = this.extraBlobs?.get(id) ?? this.storage.readBlob(id);

        return blob;
    }

    public async read(path: string): Promise<string> {
        const blob = this.readBlob(path);
=======
        const blob = this.extraBlobs !== undefined
            ? this.extraBlobs.get(id)
            : undefined;
>>>>>>> main

        return blob ?? this.storage.read(id);
    }

    public async readString(path: string): Promise<string> {
        const blob = this.readBlob(path);

        return this.storage.readString(id);
    }

    public async list(path: string): Promise<string[]> {
        let tree = this.tree;
        const pathParts = getNormalizedObjectStoragePathParts(path);
        while (tree !== undefined && pathParts.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const part = pathParts.shift()!;
            tree = tree.trees[part];
        }
        if (tree === undefined || pathParts.length !== 0) {
            throw new Error("path does not exist");
        }

        return Object.keys(tree?.blobs ?? {});
    }

    private async getIdForPath(path: string): Promise<string> {
        return this.flattenedTree[path];
    }
}
