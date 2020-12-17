/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { IDocumentStorageService, ISummaryContext } from "@fluidframework/driver-definitions";
import * as api from "@fluidframework/protocol-definitions";

/**
 * Document access to underlying storage. It is default implementation of a storage service.
 * Does not read/write anything.
 */
export class NullBlobStorageService implements IDocumentStorageService {
    public get repositoryUrl(): string {
        throw new Error("Invalid operation");
    }

    public async getSnapshotTree(version?: api.IVersion): Promise<api.ISnapshotTree | null> {
        return version ? Promise.reject(new Error("Invalid operation")) : null;
    }

    public async getVersions(versionId: string, count: number): Promise<api.IVersion[]> {
        return [];
    }

    /**
     *
     * @deprecated - only here for back compat, will be removed after release
     */
    public async read(blobId: string): Promise<string> {
        return Promise.reject(new Error("Invalid operation"));
    }

    public async write(tree: api.ITree, parents: string[], message: string, ref: string): Promise<api.IVersion> {
        return Promise.reject(new Error("Null blob storage can not write commit"));
    }

    public async uploadSummaryWithContext(summary: api.ISummaryTree, context: ISummaryContext): Promise<string> {
        return Promise.reject(new Error("Invalid operation"));
    }

    public async downloadSummary(handle: api.ISummaryHandle): Promise<api.ISummaryTree> {
        return Promise.reject(new Error("Invalid operation"));
    }

    public async createBlob(file: ArrayBufferLike): Promise<api.ICreateBlobResponse> {
        return Promise.reject(new Error("Null blob storage can not create blob"));
    }
    public async readBlob(blobId: string): Promise<ArrayBufferLike> {
        return Promise.reject(new Error("Null blob storage can not read blob"));
    }
}
