/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { strict as assert } from "assert";
import { stringToBuffer } from "@fluidframework/common-utils";
import { ISnapshotTree } from "@fluidframework/protocol-definitions";
import { IDocumentStorageService } from "@fluidframework/driver-definitions";
import { ChannelStorageService } from "../channelStorageService";

describe("ChannelStorageService", () => {
    it("Empty Tree", async () => {
        const tree: ISnapshotTree = {
            blobs: {},
            commits: {},
            // eslint-disable-next-line no-null/no-null
            id: null,
            trees: {},
        };
        const storage: Pick<IDocumentStorageService, "read" | "readBlob"> = {
            read: async (id: string) => {
                assert.fail();
            },
            readBlob: async (id: string) => {
                assert.fail();
            },
        };
        const ss = new ChannelStorageService(tree, storage);

        assert.strictEqual(await ss.contains("/"), false);
        assert.deepStrictEqual(await ss.list(""), []);
    });

    it("Top Level Blob", async () => {
        const tree: ISnapshotTree = {
            blobs: {
                foo: "bar",
            },
            commits: {},
            // eslint-disable-next-line no-null/no-null
            id: null,
            trees: {},
        };
        const storage: Pick<IDocumentStorageService, "read" | "readBlob"> = {
            read: async (id: string) => {
                return id;
            },
            readBlob: async (id: string) => {
                return stringToBuffer(id, "utf8");
            },
        };
        const ss = new ChannelStorageService(tree, storage);

        assert.strictEqual(await ss.contains("foo"), true);
        assert.deepStrictEqual(await ss.list(""), ["foo"]);
        assert.strictEqual(await ss.read("foo"), "bar");
        assert.deepStrictEqual(await ss.readBlob("foo"), stringToBuffer("bar", "base64"));
    });

    it("Nested Blob", async () => {
        const tree: ISnapshotTree = {
            blobs: {},
            commits: {},
            // eslint-disable-next-line no-null/no-null
            id: null,
            trees: {
                nested: {
                    blobs: {
                        foo: "bar",
                    },
                    commits: {},
                    // eslint-disable-next-line no-null/no-null
                    id: null,
                    trees: {},
                },
            },
        };
        const storage: Pick<IDocumentStorageService, "read" | "readBlob"> = {
            read: async (id: string) => {
                return id;
            },
            readBlob: async (id: string) => {
                return stringToBuffer(id, "utf8");
            },
        };
        const ss = new ChannelStorageService(tree, storage);

        assert.strictEqual(await ss.contains("nested/foo"), true);
        assert.deepStrictEqual(await ss.list("nested/"), ["foo"]);
        assert.strictEqual(await ss.read("nested/foo"), "bar");
        assert.deepStrictEqual(await ss.readBlob("nested/foo"), stringToBuffer("bar", "base64"));
    });
});
