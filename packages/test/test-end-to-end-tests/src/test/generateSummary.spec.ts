/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import assert from "assert";
import {
    ContainerRuntimeFactoryWithDefaultDataStore,
    DataObject,
    DataObjectFactory,
} from "@fluidframework/aqueduct";
import { TelemetryNullLogger } from "@fluidframework/common-utils";
import { ITelemetryBaseEvent } from "@fluidframework/common-definitions";
import { IContainer } from "@fluidframework/container-definitions";
import { ISummaryConfiguration } from "@fluidframework/protocol-definitions";
import { requestFluidObject } from "@fluidframework/runtime-utils";
import { ITestObjectProvider } from "@fluidframework/test-utils";
import { MockLogger } from "@fluidframework/test-runtime-utils";
import { describeNoCompat } from "@fluidframework/test-version-utils";
import { IContainerRuntimeOptions, SummaryCollection } from "@fluidframework/container-runtime";
import { flattenRuntimeOptions } from "./flattenRuntimeOptions";

const _global: any = global;
class TestDataObject extends DataObject {
    public get _root() {
        return this.root;
    }

    public get _runtime() {
        return this.runtime;
    }

    public get _context() {
        return this.context;
    }
}

function getEvent(events: ITelemetryBaseEvent[], sequenceNumber: number): any {
    for (const event of events) {
        if(event.eventName === "fluid:telemetry:Summarizer:Running:GenerateSummary" &&
            event.refSequenceNumber ? event.refSequenceNumber >= sequenceNumber : false) {
            return event;
        }
    }
}
describeNoCompat("Generate Summary Stats", (getTestObjectProvider) => {
    let provider: ITestObjectProvider;
    const dataObjectFactory = new DataObjectFactory(
        "TestDataObject",
        TestDataObject,
        [],
        []);

    const IdleDetectionTime = 100;
    const summaryConfigOverrides: Partial<ISummaryConfiguration> = {
        idleTime: IdleDetectionTime,
        maxTime: IdleDetectionTime * 12,
    };
    const runtimeOptions: IContainerRuntimeOptions = {
        summaryOptions: {
            generateSummaries: true,
            initialSummarizerDelayMs: 10,
            summaryConfigOverrides,
        },
        gcOptions: {
            gcAllowed: true,
        },
    };
    const runtimeFactory = new ContainerRuntimeFactoryWithDefaultDataStore(
        dataObjectFactory,
        [
            [dataObjectFactory.type, Promise.resolve(dataObjectFactory)],
        ],
        undefined,
        undefined,
        flattenRuntimeOptions(runtimeOptions),
    );

    let mainContainer: IContainer;
    let mainDataStore: TestDataObject;
    let summaryCollection: SummaryCollection;

    /**
     * Waits for a summary with the current state of the document (including all in-flight changes). It basically
     * synchronizes all containers and waits for a summary that contains the last processed sequence number.
     * @returns the version of this summary. This version can be used to load a Container with the summary associated
     * with it.
     */
     async function waitForSummary(): Promise<number> {
        await provider.ensureSynchronized();
        const num = mainContainer.deltaManager.lastSequenceNumber;
        await summaryCollection.waitSummaryAck(num);
        return num;
    }

    const createContainer = async (): Promise<IContainer> => provider.createContainer(runtimeFactory);

    let mockLogger: MockLogger;

    beforeEach(async () => {
        mockLogger = new MockLogger();
        _global.getTestLogger = () => mockLogger;
        provider = getTestObjectProvider();

        // Create a Container for the first client.
        mainContainer = await createContainer();

        // Set an initial key. The Container is in read-only mode so the first op it sends will get nack'd and is
        // re-sent. Do it here so that the extra events don't mess with rest of the test.
        mainDataStore = await requestFluidObject<TestDataObject>(mainContainer, "default");
        mainDataStore._root.set("test", "value");

        await provider.ensureSynchronized();

        // Create and setup a summary collection that will be used to track and wait for summaries.
        summaryCollection = new SummaryCollection(mainContainer.deltaManager, new TelemetryNullLogger());
    });

    it("should generate correct summary stats with summarizing once", async () => {
        const directoryKey = "dataStore2";

        // Create a second data store (dataStore2) and add its handle to mark it as referenced.
        const dataStore2 = await dataObjectFactory.createInstance(mainDataStore._context.containerRuntime);
        mainDataStore._root.set(directoryKey, dataStore2.handle);

        // Wait for summary that contains the above set.
        const sequenceNumber = await waitForSummary();

        const events = mockLogger.events;
        const summaryEvent = getEvent(events, sequenceNumber);

        assert(summaryEvent.dataStoreCount === 2, "wrong data store count");
        assert(summaryEvent.summarizedDataStoreCount === 2, "summarized data store count is wrong");
    });

    it("should generate correct summary stats with changed and unchanged data stores", async () => {
        // Create 5 data stores and add their handles to mark it as referenced.
        const dataStore2 = await dataObjectFactory.createInstance(mainDataStore._context.containerRuntime);
        const dataStore3 = await dataObjectFactory.createInstance(mainDataStore._context.containerRuntime);
        const dataStore4 = await dataObjectFactory.createInstance(mainDataStore._context.containerRuntime);
        const dataStore5 = await dataObjectFactory.createInstance(mainDataStore._context.containerRuntime);
        const dataStore6 = await dataObjectFactory.createInstance(mainDataStore._context.containerRuntime);

        mainDataStore._root.set("dataStore2", dataStore2.handle);
        mainDataStore._root.set("dataStore3", dataStore3.handle);
        mainDataStore._root.set("dataStore4", dataStore4.handle);
        mainDataStore._root.set("dataStore5", dataStore5.handle);
        mainDataStore._root.set("dataStore6", dataStore6.handle);

        // Wait for summary that contains the above set.
        let sequenceNumber = await waitForSummary();
        let summaryEvent = getEvent(mockLogger.events, sequenceNumber);

        assert(summaryEvent.dataStoreCount === 6, "wrong data store count");
        assert(summaryEvent.summarizedDataStoreCount === 6, "summarized data store count is wrong");

        mainDataStore._root.delete("dataStore2");

        sequenceNumber = await waitForSummary();
        summaryEvent = getEvent(mockLogger.events, sequenceNumber);

        // all dataStores
        assert(summaryEvent.dataStoreCount === 6, "wrong data store count");
        // default and dataStore2
        assert(summaryEvent.summarizedDataStoreCount === 2, "summarized data store count is wrong");

        mainDataStore._root.delete("dataStore3");
        mainDataStore._root.delete("dataStore4");
        mainDataStore._root.delete("dataStore5");

        sequenceNumber = await waitForSummary();
        summaryEvent = getEvent(mockLogger.events, sequenceNumber);
        // all dataStores
        assert(summaryEvent.dataStoreCount === 6, "wrong data store count");
        // all except dataStore2 and dataStore6
        assert(summaryEvent.summarizedDataStoreCount === 4, "summarized data store count is wrong");
    });
});
