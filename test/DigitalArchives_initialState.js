const Archives = artifacts.require("./Archives.sol");
const assert = require('chai').assert;
const should  = require('chai').should();

contract('Archives', (accounts) => {
    it('it should be initialized with two artworks from constructor (at first contract deployment)', () => {
        return Archives.deployed().then((instance) => {
            return instance.getArtworks(); // if constructor is set to insert two artworks, this function should return exactly those two 
        }).then((artworkNumber) => {
            assert.equal(artworkNumber[0], 1, 'Article with ID = 1');
            assert.equal(artworkNumber[1], 2, 'Article with ID = 2');
            should.not.exist(artworkNumber[2], 3, 'Article three'); //constructor sets two artworks starting from index 0. Therefore, artwork at index 2 should not exist
        });
    });

    it("it initializes the artworks with correct values (2 artworks from constructor)", () => {
        const contractOwner = accounts[0]; //since the constructor is called at the deployment, we suppose the author address equal to the first ganache account (0x9Fb867de1eD00990FCFFefC7925846068561ef3C)
        return Archives.deployed().then((instance) => {
          artworkInstance = instance;
          return artworkInstance.artworks(1);
        }).then((artwork) => {
          assert.equal(artwork[0], 1, "Contains the correct id");
          assert.equal(artwork[1], contractOwner, "contains the correct author, equale to contract owner");
          assert.equal(artwork[2], "Opera d'arte minore approvata", "contains the correct name");
          assert.equal(artwork[3], "QmRDKiVKaEFxcEa5z9haS1fEhQbQriqYgNnAsHmgxM2de6", "contains the correct votes count");
          return artworkInstance.artworks(2);
        }).then((artwork) => {
          assert.equal(artwork[0], 2, "contains the correct id");
          assert.equal(artwork[1], contractOwner, "contains the correct author, equale to contract owner");
          assert.equal(artwork[2], "Opera d'arte scultura", "contains the correct name");
          assert.equal(artwork[3], "QmRDKiVKaEFxcEa5z9haS1fEhQbQriqYgNnAsHmgxM2de6", "contains the correct votes count");
        });
      });
});