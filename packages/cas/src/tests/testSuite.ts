import { FetchResultCode, ICas } from '@sidetree/common';
import {
  testObj,
  testObjMultihash,
  testString,
  testStringMultiHash,
  testInteger,
  testIntegerMultiHash,
  testBuffer,
  testBufferMultihash,
  notFoundMultihash,
} from './__fixtures__';
const { version } = require('../../package.json');

const testSuite = (cas: ICas): void => {
  describe(cas.constructor.name, () => {
    beforeAll(async () => {
      await cas.initialize();
    });

    afterAll(async () => {
      await cas.close();
    });

    describe('getServiceVersion', () => {
      it('should get service version', async () => {
        const serviceVersion = await cas.getServiceVersion();
        expect(serviceVersion).toBeDefined();
        expect(serviceVersion.name).toBeDefined();
        expect(serviceVersion.version).toBe(version);
      });
    });

    describe('write', () => {
      it('should write a JSON and return content id', async () => {
        const cid = await cas.write(Buffer.from(JSON.stringify(testObj)));
        expect(cid).toBe(testObjMultihash);
      });

      it('should write a string and return content id', async () => {
        const cid = await cas.write(Buffer.from(testString));
        expect(cid).toBe(testStringMultiHash);
      });

      it('should write an integer and return content id', async () => {
        const cid = await cas.write(Buffer.from(testInteger.toString()));
        expect(cid).toBe(testIntegerMultiHash);
      });

      it('should write a buffer and return content id', async () => {
        const cid = await cas.write(testBuffer);
        expect(cid).toBe(testBufferMultihash);
      });
    });

    describe('read', () => {
      it('should read a JSON', async () => {
        const fetchResult = await cas.read(testObjMultihash);
        expect(fetchResult.code).toEqual(FetchResultCode.Success);
        expect(JSON.parse(fetchResult.content!.toString())).toEqual(testObj);
      });

      it('should read a string', async () => {
        const fetchResult = await cas.read(testStringMultiHash);
        expect(fetchResult.code).toEqual(FetchResultCode.Success);
        expect(fetchResult.content!.toString()).toEqual(testString);
      });

      it('should read an integer', async () => {
        const fetchResult = await cas.read(testIntegerMultiHash);
        expect(fetchResult.code).toEqual(FetchResultCode.Success);
        expect(Number.parseInt(fetchResult.content!.toString())).toEqual(
          testInteger
        );
      });

      it('should read a buffer', async () => {
        const fetchResult = await cas.read(testBufferMultihash);
        expect(fetchResult.code).toEqual(FetchResultCode.Success);
        expect(fetchResult.content).toEqual(testBuffer);
      });

      it('should return not found if cid does not exist', async () => {
        const fetchResult = await cas.read(notFoundMultihash);
        expect(fetchResult.code).toEqual(FetchResultCode.NotFound);
      });
    });
  });
};

// eslint-disable-next-line jest/no-export
export default testSuite;
