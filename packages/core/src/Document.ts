import { DocumentModel, PublicKeyModel } from '@sidetree/common';

/**
 * Class containing reusable document related operations.
 * NOTE: This class should ONLY be used by the `DocumentComposer`.
 */
export default class Document {
  /**
   * Gets the specified public key from the given DID Document.
   * Returns undefined if not found.
   * @param keyId The ID of the public-key.
   */
  public static getPublicKey(
    document: DocumentModel,
    keyId: string
  ): PublicKeyModel | undefined {
    for (let i = 0; i < document.public_keys.length; i++) {
      const publicKey = document.public_keys[i];

      if (publicKey.id === keyId) {
        return publicKey;
      }
    }

    return undefined;
  }
}
