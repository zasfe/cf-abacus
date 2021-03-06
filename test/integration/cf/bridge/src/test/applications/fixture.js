'use sterict';

const lifecycleManager = require('abacus-lifecycle-manager')();

const {
  abacusCollectorMock,
  applicationsCloudControllerMock,
  uaaServerMock,
  externalSystems
} = require('abacus-mock-util');

const externalSystemsMocks = externalSystems({
  abacusCollector: abacusCollectorMock,
  cloudController: applicationsCloudControllerMock,
  uaaServer: uaaServerMock
});

const createEventTimestampGenerator = require('../event-timestamp-generator');
const createBridge = require('../bridge');

const oauth = {
  abacusCollectorScopes: ['abacus.usage.write', 'abacus.usage.read'],
  cfAdminScopes: [],
  abacusCollectorToken: 'abacus-collector-token',
  cfAdminToken: 'cfadmin-token'
};

const usageEventStates = {
  default: 'STARTED'
};

const defaultUsageEvent = {
  state: 'STARTED',
  previousState: 'STOPPED',
  appGuid: 'test-app-guid',
  eventGuid: 'event-guid',
  orgGuid: 'test-org',
  spaceGuid: 'space-guid',
  instanceCount: 5,
  previousInstanceCount: 3,
  memoryPerInstance: 2,
  previousMemoryPerInstance: 6
};

const bridge = createBridge({
  bridge: lifecycleManager.modules.applications,
  port: 9500,
  customEnv: {
    ORGS_TO_REPORT: `["${defaultUsageEvent.orgGuid}"]`
  }
});

const eventTimestampGenerator = createEventTimestampGenerator(bridge.env.minimalAgeInMinutes + 1);
const validUsageEvent = () => {
  const createdAt = eventTimestampGenerator.next().value;
  return {
    metadata: {
      created_at: createdAt,
      guid: defaultUsageEvent.eventGuid + '-' + createdAt
    },
    entity: {
      state: defaultUsageEvent.state,
      previous_state: defaultUsageEvent.previousState,
      org_guid: defaultUsageEvent.orgGuid,
      space_guid: defaultUsageEvent.spaceGuid,
      app_guid: defaultUsageEvent.appGuid,
      instance_count: defaultUsageEvent.instanceCount,
      previous_instance_count: defaultUsageEvent.previousInstanceCount,
      memory_in_mb_per_instance: defaultUsageEvent.memoryPerInstance,
      previous_memory_in_mb_per_instance: defaultUsageEvent.previousMemoryPerInstance
    }
  };
};

const usageEvent = () => {
  const resultUsageEvent = validUsageEvent();

  const overwritable = {
    overwriteEventGuid: (value) => {
      resultUsageEvent.metadata.guid = value;
      return overwritable;
    },
    overwriteCreatedAt: (value) => {
      resultUsageEvent.metadata.created_at = value;
      return overwritable;
    },
    overwriteState: (value) => {
      resultUsageEvent.entity.state = value;
      return overwritable;
    },
    overwriteOrgGuid: (value) => {
      resultUsageEvent.entity.org_guid = value;
      return overwritable;
    },
    get: () => resultUsageEvent
  };

  return overwritable;
};

const collectorUsage = () => {
  const defaultUsage = {
    start: 'eventTimestamp',
    end: 'eventTimestamp',
    organization_id: defaultUsageEvent.orgGuid,
    space_id: defaultUsageEvent.spaceGuid,
    consumer_id: `app:${defaultUsageEvent.appGuid}`,
    resource_id: 'linux-container',
    plan_id: 'standard',
    resource_instance_id: `memory:${defaultUsageEvent.appGuid}`,
    measured_usage: [
      {
        measure: 'current_instance_memory',
        quantity: 2097152
      },
      {
        measure: 'current_running_instances',
        quantity: 5
      },
      {
        measure: 'previous_instance_memory',
        quantity: 0
      },
      {
        measure: 'previous_running_instances',
        quantity: 0
      }
    ]
  };

  const overwritable = {
    overwriteUsageTime: (timestamp) => {
      defaultUsage.start = timestamp;
      defaultUsage.end = timestamp;
      return overwritable;
    },
    overwriteMeasuredUsage: (state) => {
      return overwritable;
    },
    get: () => defaultUsage
  };

  return overwritable;
};

module.exports = {
  oauth,
  bridge,
  usageEvent,
  collectorUsage,
  env: bridge.env,
  usageEventStates,
  defaultUsageEvent,
  externalSystemsMocks
};
