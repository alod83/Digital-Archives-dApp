require('buffer');
const IPFS = require('ipfs-api');
const ipfs = new IPFS({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' }); // leaving out the arguments will default to these values

App = {
  web3Provider: null,
  contracts: {},
  account: 0x0,
  loading: false,
  ipfsHash: '',
  ipfsHashStore: [],
  store: [],
  metaData: {},
  artworkCheckerPermissions: false,

  init: function () {
    return App.initWeb3();
  },

  initWeb3: function () {
    // Is there an injected web3 instance?
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
    } else {
      // If no injected web3 instance is detected, fall back to Ganache
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
    }
    web3 = new Web3(App.web3Provider);
    App.displayAccountInfo();
    return App.initContract();
  },

  permissionCheck: () => {
    console.log('perma', App.account);
  },

  displayAccountInfo: function () {
    //asynchronous
    web3.eth.getCoinbase(function (err, account) {
      if (err === null) {
        App.account = account;
      }
      $('#account').text(account);
      console.log('times');
      //App.permissionCheck();
      web3.eth.getBalance(account, function (err, balance) {
        if (err === null) {
          $('#accountBalance').text(web3.fromWei(balance, 'ether') + ' ETH');
        }
      });
    });
  },

  initContract: function () {
    // fetch and store  
    $.getJSON('Archives.json', function (archivesArtifact) {
      // get the contract artifact file and use it to instantiate a truffle contract abstraction
      App.contracts.Archives = TruffleContract(archivesArtifact);
      // set the provider for our contracts
      App.contracts.Archives.setProvider(App.web3Provider);
      //listen to events
      App.bindEvents();
      //retrieve the article from the contract
      return App.reloadArtworks();
    })
  },

  reloadArtworks: function () {
    //avoid reentry 
    if (App.loading) {
      return;
    }
    App.loading = true;
    // refresh account information (because the balance might have changed)
    App.displayAccountInfo();
    var contractInstance;
    App.contracts.Archives.deployed().then(function (instance) {
      contractInstance = instance;
      return contractInstance.getArtworks(); //async again -- returns an array of ids all artworks available
    }).then(function (artworksIds) {
      //retrieve the placeholder and clear it
      $('#archivesRow').empty();
      for (var i = 0; i < artworksIds.length; i++) {
        var artworkId = artworksIds[i];
        //take artworks from the mapping
        contractInstance.artworks(artworkId.toNumber()).then(function (artwork) {
          App.displayArtworks(artwork[0], artwork[1], artwork[2], artwork[3], artwork[4], artwork[5]);
        });
      }
      App.loading = false;
    }).catch(function (error) {
      console.error(error.message);
      App.loading = false;
    });
  },

  displayArtworks: function (id, author, name, descriptionHash, dataHash, validation) {
    const artRow = $('#archivesRow');
    const archiviesTemplate = $('#archiviesTemplate');
    archiviesTemplate.find('.panel-title').text('Title: '+name);
    archiviesTemplate.find('.art-id').text(id);
    archiviesTemplate.find('.artwork-object').attr('data-id', id);
    archiviesTemplate.find('.artwork-object').attr('data-val', validation);
    archiviesTemplate.find('.art-author').text(author);
    archiviesTemplate.find('.art-name').text(name);
    archiviesTemplate.find('.art-description').text(`https://ipfs.io/ipfs/${descriptionHash}`);
    archiviesTemplate.find('.art-validity').text(validation);
    archiviesTemplate.find('.art-validity').attr('data-id', id);
    archiviesTemplate.find('.alert').attr('data-id', id);
    archiviesTemplate.find('img').attr('src', `https://ipfs.io/ipfs/${dataHash}`);
    archiviesTemplate.find('.object-button').attr('data-id', id);

    artRow.append(archiviesTemplate.html());
  },

  uploadData: () => {
    App.filesToIPFS(App.store);
  },

  generateMetadata: function (hash) {
    if(App.loading) {
      return;
    }
    console.log('test', hash)
    App.loading = true;
    console.log('step start generateMetadata');
    let contentRow = $('#column-test-content');
    let generatedXMLCode = '';
  	let generatedHTMLCode = '';
    let title = '';
    title = $('input[name="title"]');
    let creator = '';
    creator = $('input[name="creator"]');
    let subject  = '';
    subject = $('input[name="subject"]');
    let description  = '';
    description = $('textarea[name="description"]');
    /*let date  = '';
    date = $('input[name='date']');
    let type   = '';
    type = $('input[name='type']');
    let source  = '';
    source = $('input[name='source']');
    let language  = '';
    language = $('input[name='language']');
    let coverage  = '';
    coverage = $('input[name='coverage']');*/
    console.log(title);
    generatedXMLCode = `
    <dc:title> ${title.val()} </dc:title>
    <dc:creator> ${creator.val()} </dc:creator>
    <dc:subject> ${subject.val()} </dc:subject>
    <dc:description> ${description.val()} </dc:description>
    `

    generatedHTMLCode = `
    <meta name='DC.Title' content='${title.val()}'> 
    <meta name='DC.Creator' content='${creator.val()}'> 
    <meta name='DC.Subject' content='${subject.val()}'>
    <meta name='DC.Description' content='${description.val()}'>
    `

    console.log(generatedXMLCode);
    console.log(generatedHTMLCode);
    contentRow.text(generatedHTMLCode);
    contentRow.text(generatedHTMLCode);
    contentRow.append(generatedHTMLCode);
    contentRow.append(generatedXMLCode);
    /*
    const data = [
      {
        title: `<meta name='DC.Title' content='${title.val()}'>`,
        creator: `<meta name='DC.Creator' content='${creator.val()}'>`
        
      },
      {test: `${hash}`},
      {test2: `${App.ipfsHashStore}`}
  ]*//*
  const data = 
    {
      description: generatedXMLCode,
      test: hash,
      test2: App.ipfsHashStore
    };*/
    const data = 
    {
      name: title.val(),
      description: generatedXMLCode,
      objectPreview: hash,
      objectFiles: App.ipfsHashStore
    };
  App.metaData = data;
  console.log(App.ipfsHash);
  console.log('step end generateMetadata');
  App.descriptionToIPFS(data);
  App.loading = false;
  return;
  },

  uploadArtw: function (hash, objectDesc) {
    if(App.loading) {
      return;
    }
    //retrieve details of the artw
    console.log('JUST BEFORE THE EVENT App.ipfsHash', App.ipfsHash);
    console.log('JUST BEFORE THE EVENT hash', hash);
    console.log('blob', objectDesc);
    console.log(objectDesc.description)
    console.log('...Uploading your object to blockchain...');
    //console.log(artwName, artwDescription, App.ipfsHash);
    console.log(objectDesc.name, hash, App.ipfsHash);
    App.contracts.Archives.deployed().then(function (instance) {
      return instance.publishArtwork(objectDesc.name, hash, App.ipfsHash, {
        from: App.account
        //gas: 500000
      });
    }).then(function (result) {
      console.log(result);
      var receiptRow = $('#receiptRow');
      //the receipt
      $.each(result.receipt, function( key, value ) {
        console.log( key + ': ' + value );
        var x = document.createElement('li');
        x.innerHTML =  key + ': ' + value; 
        receiptRow.append(x);
        console.log('...Done Uploading your object to blockchain...');
      });
    }).catch(function (error) {
      console.error(error);
    });
  },

  filesToIPFS: async function (fileSequence) {
    console.log('filesToIPFS', fileSequence);
    App.loading = true;
    App.loadingProgress(1);
    console.log('...Uploading your files to IPFS...');
    await ipfs.files.add(fileSequence, (err, result) => {
      if (err) {
        console.error(err);
        return
      }
      for(let key in result) {
        console.log('keys', key);
        App.ipfsHashStore.push(result[key].hash);
      }
      console.log('ipfs result', result);
      const hash = result[0].hash;
      App.ipfsHash = hash;
      App.loading = false;
      console.log('added data hash:', hash);
      console.log('...DONE Uploading your files to IPFS...');
      App.generateMetadata(hash);
  });
  },

  descriptionToIPFS: async function (objectDescription) {
    console.log('descriptionToIPFS', objectDescription);
    console.log('...Uploading your metadata description to IPFS...');
    let uploadDesc = Buffer.from(JSON.stringify(objectDescription));
    App.loading = true;
    await ipfs.files.add(uploadDesc, (err, result) => {
      App.loading = false;
      if (err) {
        console.error(err);
        return
      }
      console.log('ipfs result', result);
      const hash = result[0].hash;
      console.log('added data hash:', hash);
      console.log('...Done Uploading your metadata description to IPFS...');
      App.uploadArtw(hash, objectDescription);
      ipfs.files.cat(hash, function (err, file) {
        if (err) {
          throw err
        }
      });
      return hash;
    })
  },

  loadingProgress: function (step) {
    switch (step) {
      case 1:
      console.log('loadingProgress');
    }
    const loader = document.getElementById('loader');
    const btnSendArt = document.getElementById('sendToChain');
  },

  //listen for events global
  bindEvents: function () {
    //New Artwork Insertion Modal Open
    const newArtworkBtn = document.getElementById('newArtwork');
    newArtworkBtn.addEventListener('click', () => {
      const openModal = document.getElementById('openModal');
      openModal.classList.add('is-active');
    }); //New Artwork Insertion Modal Close
    const closeModal = openModal.querySelector('.delete');
    closeModal.addEventListener('click', () => 
      openModal.classList.remove('is-active'), false); 
    //Binding of artwork object to IPFS preview by data-id 
    const artworkContainer = document.getElementById('archivesRow');
    artworkContainer.addEventListener('click', (ev) => {
        if(ev.target.classList.contains('object-button')) {
          const artworkPreview = document.getElementById('artwork-preview');
          App.dataToModal(ev, artworkPreview);
        }
      }, false);
    let imagePreview = document.getElementById('imagePreview');
    imagePreview.src = 'http://place-hold.it/150x150';
    //Event listeners
    let uploadFile = document.getElementById('captureFileUpload');
    uploadFile.addEventListener('change', fileUploadForm);
    function fileUploadForm(ev) {
      console.log(ev);
      const files = ev.target.files;
      let fileResult = document.getElementById('filePreview');
      //let store = [];
      let sessionIndex = App.store.length;
      let eventIndex = 0;
      console.log('sessionIndex',sessionIndex);
      for(let i = sessionIndex; i < (sessionIndex+files.length); i++) {
        let file = files[eventIndex];
        if(!file.type.match('image')) continue;
        let readerIndex = eventIndex; //looks like there is some problem with chaining events
        eventIndex++;
        const reader = new window.FileReader();
        console.log(file);
        reader.readAsArrayBuffer(file);
        reader.onloadend = () => {
          App.store.push(Buffer(reader.result));
          console.log(Buffer(reader.result));
          let preview = document.createElement('img');
          let deleteBtn = document.createElement('button');
          deleteBtn.classList = 'delete is-small';
          deleteBtn.setAttribute('data-id', i);
          preview.setAttribute('data-id', i);
          preview.src = URL.createObjectURL(ev.target.files[readerIndex]);
          preview.addEventListener('click', chooseMainThumbnail);
          let test = document.createElement('span'); //TODO testing purposes
          test.append(preview);
          test.append(deleteBtn);
          fileResult.append(test);        }
      }
      function chooseMainThumbnail (ev) {
        let fileResult = document.getElementById('filePreview');
        let imgList = fileResult.querySelectorAll('img');
        for(let element of imgList) {
          element.classList = '';
        }
        let selectedElementId = ev.target.getAttribute('data-id')
        console.log('before', App.store);
        console.log('selectedElementId',selectedElementId);
        if(selectedElementId == App.store[0]) {
          ev.target.classList.toggle('mainPreview');
          return;
        }
        let temp = App.store[0];
        App.store[0] = App.store[selectedElementId];
        App.store[selectedElementId] = temp;
        console.log('after', App.store);
        console.log(ev);
        console.log(ev.target);
        ev.target.classList.toggle('mainPreview');
        console.log('num', selectedElementId);
      }
    }

    App.contracts.Archives.deployed().then(function (instance) {
      instance.LogSendArtw({}, {}).watch(function (error, event) {
        if (!error) {
          console.log('event LogSendArtw fired', event.args._name);
          $('#events').append(`
          <li>
            <b>publishArtwork</b> contract has been called correctly, artwork
            <b>${event.args._name}</b> has been added to the blockchain by account: 
            <b>${event.args._author}</b>
          </li>
        `);
        } else {
          console.error(error);
        }
        //reload and update the interface
        App.reloadArtworks();
      });
    });

    App.contracts.Archives.deployed().then(function (instance) {
      instance.ValidateArtw({}, {}).watch(function (error, event) {
        if (!error) {
          console.log('event validateArtw fired', event.args._id);
          $('#events').append(`
          <li>
            <b>approveArtwork</b> contract has been called correctly, artwork with id: 
            <b>${event.args._id}</b> has been validated by the following artwork checker: 
            <b>${event.args._author}</b>
          </li>
        `);
        } else {
          console.error(error);
        }
        //reload and update the interface
        App.reloadArtworks();
      });
    });
  },

  dataToModal: function(ev, artworkPreview) {
    console.log('data to modal', ev.target.getAttribute('data-id'));
    artworkPreview.classList.add('is-active'); //TODO
    const artId = ev.target.getAttribute('data-id');
    App.contracts.Archives.deployed().then(function (instance) {
      contractInstance = instance;
      return ev.target.getAttribute('data-id');
    }).then(function (artId) {
        console.log('inside', artId);
        const artworkId = artId; //TODO temporary then select from ev target!
        //take artworks from the mapping
        contractInstance.artworks(artworkId).then(function (artwork) {
          console.log(artwork[0], artwork[1], artwork[2], artwork[3], artwork[4], artwork[5]);
          App.loadModalData(artwork[0], artwork[1], artwork[2], artwork[3], artwork[4], artwork[5]);
        });
      });
  },

  loadModalData: function (id, author, name, descriptionHash, dataHash, validation) {
    const titlePreamble = document.getElementById('artworkNamePreamble');
    const authorPreamble = document.getElementById('authorAddressPreamble');
    const previewPreamble = document.getElementById('previewPreamble');
    const title = document.querySelector('.description-title');
    const content = document.querySelector('.description-content');
    const artworkActions = document.querySelector('.artwork-actions');
    const btnAprove = artworkActions.querySelector('.btn-adopt');
    const btnModify = artworkActions.querySelector('.btn-modify-metadata');
    ipfs.files.cat(descriptionHash, function (err, file) {
      if (err) { throw err; }
      let ipfsResult =  file.toString('utf8');
      var objectResult = JSON.parse(ipfsResult);
      console.log(objectResult);
      content.append(objectResult);
      content.textContent = objectResult.description;
      previewPreamble.src = `https://ipfs.io/ipfs/${objectResult.objectPreview}`;
      titlePreamble.textContent = name;
      authorPreamble.textContent = author;
      title.textContent = name;
      if(App.account === author && validation === false) {
        btnAprove.disabled = false;
        btnAprove.setAttribute('data-id', id);
        btnAprove.classList.remove('hidden');
        btnAprove.addEventListener('click', () => App.validateArtwork(id), false);
      } else {
        btnAprove.removeAttribute('data-id');
        btnAprove.disabled = true;
      }
      if(App.account === author) {
        btnModify.disabled = false;
        btnModify.addEventListener('click', () => App.modifyMetadata(id), false);
      };
      //
      for(key of objectResult.objectFiles) {
        console.log(key);
        let objectFilePreview = document.createElement('img');
        objectFilePreview.setAttribute('src', `https://ipfs.io/ipfs/${key}`);
        console.log(objectFilePreview);
        content.append(objectFilePreview);
      }
    });
  },

  modifyMetadata: (id) => {
    console.log('event modifyMetadata', id);
    let newDescription = App.generateNewDesc();
    console.log(newDescription);
  },

  generateNewDesc: () => {
    return 'abc';
  },

  validateArtwork: (id) => {
    const idToApprove = id.toNumber();
    console.log('validateArtwork id to Approve', idToApprove);
    App.contracts.Archives.deployed().then(function (instance) {
      return instance.approveArtwork(idToApprove, {
        from: App.account
        //gas: 500000
      });
    }).then(function (result) {
      //App.updateArtworkState();
      console.log('ValidateArtworkresult', result);
      //App.reloadArtworks();
    });
},

modMetadata: () => {
  console.log('kk'); //TODO: better to show the insertionModalForm directly instead of modifying
}
//function modifyArtworkDescription (uint _id, string _newDescriptionHash) public {
};

$(function () {
  $(window).load(function () {
    App.init();
  });
});