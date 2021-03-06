/*
 * The code in this file originated from
 * @see https://github.com/decentralized-identity/sidetree
 * For the list of changes that was made to the original code
 * @see https://github.com/transmute-industries/sidetree.js/blob/main/reference-implementation-changes.md
 *
 * Copyright 2020 - Transmute Industries Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ErrorCode, MapFileModel, SidetreeError } from '@sidetree/common';
import UpdateOperation from '../UpdateOperation';
import ArrayMethods from '../util/ArrayMethods';
import Compressor from '../util/Compressor';
import JsonAsync from '../util/JsonAsync';

/**
 * Class containing Map File related operations.
 */
export default class MapFile {
  /**
   * Class that represents a map file.
   * NOTE: this class is introduced as an internal structure in replacement to `MapFileModel`
   * to keep useful metadata so that repeated computation can be avoided.
   */
  private constructor(
    public readonly model: MapFileModel,
    public readonly didUniqueSuffixes: string[],
    public readonly updateOperations: UpdateOperation[]
  ) {}

  /**
   * Parses and validates the given map file buffer.
   * @throws `SidetreeError` if failed parsing or validation.
   */
  public static async parse(mapFileBuffer: Buffer): Promise<MapFile> {
    let decompressedBuffer;
    try {
      decompressedBuffer = await Compressor.decompress(mapFileBuffer);
    } catch (error) {
      throw SidetreeError.createFromError(
        ErrorCode.MapFileDecompressionFailure,
        error
      );
    }

    let mapFileModel;
    try {
      mapFileModel = await JsonAsync.parse(decompressedBuffer);
    } catch (error) {
      throw SidetreeError.createFromError(ErrorCode.MapFileNotJson, error);
    }

    const allowedProperties = new Set(['chunks', 'operations']);
    for (const property in mapFileModel) {
      if (!allowedProperties.has(property)) {
        throw new SidetreeError(ErrorCode.MapFileHasUnknownProperty);
      }
    }

    MapFile.validateChunksProperty(mapFileModel.chunks);

    const updateOperations = await MapFile.parseOperationsProperty(
      mapFileModel.operations
    );
    const didUniqueSuffixes = updateOperations.map(
      (operation) => operation.didUniqueSuffix
    );

    const mapFile = new MapFile(
      mapFileModel,
      didUniqueSuffixes,
      updateOperations
    );
    return mapFile;
  }

  /**
   * Validates the given `operations` property, throws error if the property fails validation.
   */
  private static async parseOperationsProperty(
    operations: any
  ): Promise<UpdateOperation[]> {
    if (operations === undefined) {
      return [];
    }

    const properties = Object.keys(operations);
    if (properties.length !== 1) {
      throw new SidetreeError(
        ErrorCode.MapFileOperationsPropertyHasMissingOrUnknownProperty
      );
    }

    const updateOperations: UpdateOperation[] = [];
    if (!Array.isArray(operations.update)) {
      throw new SidetreeError(ErrorCode.MapFileUpdateOperationsNotArray);
    }

    // Validate each update operation.
    for (const operation of operations.update) {
      const updateOperation = await UpdateOperation.parseOperationFromMapFile(
        operation
      );
      updateOperations.push(updateOperation);
    }

    // Make sure no operation with same DID.
    const didUniqueSuffixes = updateOperations.map(
      (operation) => operation.didUniqueSuffix
    );
    if (ArrayMethods.hasDuplicates(didUniqueSuffixes)) {
      throw new SidetreeError(ErrorCode.MapFileMultipleOperationsForTheSameDid);
    }

    return updateOperations;
  }

  /**
   * Validates the given `chunks` property, throws error if the property fails validation.
   */
  private static validateChunksProperty(chunks: any) {
    if (!Array.isArray(chunks)) {
      throw new SidetreeError(
        ErrorCode.MapFileChunksPropertyMissingOrIncorrectType
      );
    }

    // This version expects only one hash.
    if (chunks.length !== 1) {
      throw new SidetreeError(
        ErrorCode.MapFileChunksPropertyDoesNotHaveExactlyOneElement
      );
    }

    const chunk = chunks[0];
    const properties = Object.keys(chunk);
    if (properties.length !== 1) {
      throw new SidetreeError(
        ErrorCode.MapFileChunkHasMissingOrUnknownProperty
      );
    }
  }

  /**
   * Creates the Map File buffer.
   */
  public static async createBuffer(
    chunkFileHash: string,
    updateOperationArray: UpdateOperation[]
  ): Promise<Buffer> {
    const updateOperations = updateOperationArray.map((operation) => {
      return {
        did_suffix: operation.didUniqueSuffix,
        signed_data: operation.signedDataJws.toCompactJws(),
      };
    });

    const mapFileModel: MapFileModel = {
      chunks: [{ chunk_file_uri: chunkFileHash }],
    };

    // Only insert an `operations` property if there are update operations.
    if (updateOperations.length > 0) {
      mapFileModel.operations = {
        update: updateOperations,
      };
    }

    const rawData = JSON.stringify(mapFileModel);
    const compressedRawData = await Compressor.compress(Buffer.from(rawData));

    return compressedRawData;
  }
}
