/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { IsoBuffer } from "@fluidframework/common-utils";

/**
 * Convert binary blob to string format
 *
 * @param blob - the binary blob
 * @returns the blob in string format
 */
export const bufferToString = (blob: ArrayBufferLike): string => IsoBuffer.from(blob).toString("utf8");

/**
 * Convert binary blob to base64 format
 *
 * @param blob - the binary blob
 * @returns the blob in base64 format
 */
export const bufferToBase64 = (blob: ArrayBufferLike): string => IsoBuffer.from(blob).toString("base64");
