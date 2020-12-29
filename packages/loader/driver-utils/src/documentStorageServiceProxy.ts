/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { fromUtf8ToBase64 } from "@fluidframework/common-utils";
import {
    IDocumentStorageService,
    ISummaryContext,
} from "@fluidframework/driver-definitions";
import {
    ICreateBlobResponse,
    ISnapshotTree,
    ISummaryHandle,
    ISummaryTree,
    ITree,
    IVersion,
} from "@fluidframework/protocol-definitions";

export class DocumentStorageServiceProxy implements IDocumentStorageService {
    public get repositoryUrl(): string {
        return this.internalStorageService.repositoryUrl;
    }

    constructor(protected readonly internalStorageService: IDocumentStorageService) { }

    public async getSnapshotTree(version?: IVersion): Promise<ISnapshotTree | null> {
        return this.internalStorageService.getSnapshotTree(version);
    }

    public async getVersions(versionId: string, count: number): Promise<IVersion[]> {
        return this.internalStorageService.getVersions(versionId, count);
    }

    /**
     *
     * @deprecated - only here for back compat, will be removed after release
     */
    public async read(blobId: string): Promise<string> {
        return fromUtf8ToBase64("Deprecated");
    }

    public async write(tree: ITree, parents: string[], message: string, ref: string): Promise<IVersion> {
        return this.internalStorageService.write(tree, parents, message, ref);
    }

    public async uploadSummaryWithContext(summary: ISummaryTree, context: ISummaryContext): Promise<string> {
        return this.internalStorageService.uploadSummaryWithContext(summary, context);
    }

    public async downloadSummary(handle: ISummaryHandle): Promise<ISummaryTree> {
        return this.internalStorageService.downloadSummary(handle);
    }

    public async createBlob(file: ArrayBufferLike): Promise<ICreateBlobResponse> {
        return this.internalStorageService.createBlob(file);
    }

    public async readBlob(blobId: string): Promise<ArrayBufferLike> {
        return this.internalStorageService.readBlob(blobId);
    }
}
