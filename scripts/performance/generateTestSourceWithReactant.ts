/* eslint-disable @typescript-eslint/ban-ts-ignore */
/* eslint-disable no-bitwise */
/* eslint-disable prettier/prettier */
/* eslint-disable no-unused-expressions */
import { writeFileSync } from 'fs';
import { argv } from 'yargs';

const {
  classAmount = 50,
  oneClassReducerAmount = 10,
  computedTime = (50000 / classAmount) | 0, // 1000 -> Run out of memory
  allCheckedState = true,
  expectedResult,
} = argv.mode ? {
  small: {
    classAmount: 100,
    oneClassReducerAmount: 20,
    computedTime: 1000,
    allCheckedState: true,
    expectedResult: {
      boostrap: 60,
      computed: 1280,
      cache: 510,
    }
  },
  big: {
    classAmount: 200,
    oneClassReducerAmount: 30,
    computedTime: 1000,
    allCheckedState: true,
    expectedResult: {
      boostrap: 110,
      computed: 3400,
      cache: 1400,
    },
  },
  huge: {
    classAmount: 200,
    oneClassReducerAmount: 100,
    computedTime: 1000,
    allCheckedState: true,
    expectedResult: {
      boostrap: 600,
      computed: 37400,
      cache: 18300,
    },
  }
  // @ts-ignore
}[argv.mode] : (argv as any);

const checkedState = allCheckedState ? '' : '(this as any)[storeKey].getState()';
const source = `
// @ts-nocheck
process.env.NODE_ENV = 'production';
console.log('mode:', ${JSON.stringify(argv.mode)});
console.log(${JSON.stringify({
  classAmount,
  oneClassReducerAmount,
  computedTime,
  allCheckedState,
})});
console.log('expectedResult:', ${JSON.stringify(expectedResult)});
declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: any;
  }
}
global.window = {};
import React from 'react';
import { render } from 'reactant-web';
import { injectable, action, computed, selector, createApp, ViewModule, createSelector, storeKey, state } from '..';
let time = Date.now();
const computedTime = ${computedTime};
const expectedResult = ${JSON.stringify(expectedResult)};
@injectable()
class Service0 {
  @state
  test0 = 0;

  name = 'Service0';

  get props() {
    return {
      sum: this.getSum(${checkedState}),
    };
  }

  @action
  decrease() {
    this.test0 -= 1;
  }

  getSum = createSelector(
    () => this.test0,
    test0 => {
      return test0;
    }
  );
}

${(() => {
  let classStr = '';
  for (let i = 1; i < classAmount; i += 1) {
    classStr += `
@injectable()
class Service${i} {
  constructor(public service${i - 1}: Service${i - 1}) {}

  name = 'Service${i}';

  ${(() => {
    let stateStr = '';
    for (let j = 0; j < oneClassReducerAmount; j+=1) {
      stateStr += `
        @state
        test${j} = ${j};
      `;
    }
    return stateStr;
  })()}

  get props() {
    return {
      sum: this.getSum(${checkedState}),
    };
  }

  @action
  decrease() {
    this.test0 -= 1;
  }

  getSum = createSelector(
    () => this.service${i - 1}.props.sum,
    ${(() => {
      let stateStr = '';
      for (let j = 0; j < oneClassReducerAmount; j+=1) {
        stateStr += `
          () => this.test${j},
        `;
      }
      return stateStr;
    })()}
    (service${i - 1}
      ${(() => {
        let stateStr = '';
        for (let j = 0; j < oneClassReducerAmount; j+=1) {
          stateStr += `
            , test${j}
          `;
        }
        return stateStr;
      })()}
    ) => {
      return service${i - 1}
      ${(() => {
        let stateStr = '';
        for (let j = 0; j < oneClassReducerAmount; j+=1) {
          stateStr += `
            + test${j}
          `;
        }
        return stateStr;
      })()}
      ;
    }
  );
}
    `;
  }
  return classStr;
})()}

@injectable()
class App extends ViewModule {
  constructor(public service${classAmount - 1}: Service${classAmount -
  1}, public service0: Service0) {
    super();
  }

  get props() {
    return {
      sum: this.service${classAmount - 1}.props.sum,
    };
  }

  component() {
    return <></>;
  }
}
console.log('wrap time:', Date.now() - time);
time = Date.now();
const app = createApp({
  main: App,
  render,
  devOptions: {
    autoFreeze: false,
    reduxDevTools: false,
  },
});
const boostrapTime = Date.now() - time;
console.log('boostrap time:', boostrapTime);
if (expectedResult && boostrapTime > expectedResult.boostrap) console.log('boostrap performance reduction:', boostrapTime, expectedResult.boostrap);
time = Date.now();
${(() => {
  let computedStr = '';
  for (let i = 0; i < computedTime; i+=1) {
    computedStr += `
      app.instance.service0.decrease();
      app.instance.props.sum;
    `;
  }
  return computedStr;
})()}
const allComputedChangedTime = Date.now() - time;
console.log('computed with changed time:', allComputedChangedTime);
console.log('per computed changed Time:', allComputedChangedTime / computedTime);
if (expectedResult && allComputedChangedTime > expectedResult.computed) console.log('computed with changed performance reduction:', allComputedChangedTime, expectedResult.computed);
time = Date.now();
${(() => {
  let computedStr = '';
  for (let i = 0; i < computedTime; i+=1) {
    computedStr += `
      app.instance.props.sum;
    `;
  }
  return computedStr;
})()}
const allComputedNoChangedTime = Date.now() - time;
console.log('computed without changed time:', allComputedNoChangedTime);
console.log('per computed no changed time:', allComputedNoChangedTime / computedTime);
if (expectedResult && allComputedNoChangedTime > expectedResult.cache) console.log('computed without changed performance reduction:', allComputedNoChangedTime, expectedResult.cache);
`;

writeFileSync('./packages/reactant/test/performance.tsx', source);
