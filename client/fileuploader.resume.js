/**
 * add resume options, translate this option in to 
 */
qq.extend(qq.FileUploader.prototype, {_createUploadHandler: function (){
	var handler = qq.FileUploaderBasic.prototype._createUploadHandler.call(this);
	handler._options.resume = this._options.resume;
	return handler
}})
qq.extend(qq.UploadHandlerXhr.prototype, {
	_upload_old: qq.UploadHandlerXhr.prototype._upload, 
	_upload: function (id, params, part){
		this._options.resume && this._upload_new(id, params, part) || this._upload_old(id, params);
	},
	_upload_new: function(id, params, part){
        this._options.onUpload(id, this.getName(id), true);
        part =  part || 1
        var file = this._files[id],
            name = this.getName(id),
            size = this.getSize(id), 
			BYTES_PER_CHUNK = this._options.resume.chunk || 1024 * 1024, 
			start = (part - 1) * BYTES_PER_CHUNK, 
			end = part * BYTES_PER_CHUNK, 
			slice = file.mozSlice || file.webkitSlice || file.slice, 
			chunk = slice.call(file,start, end), 
			xhr = this._xhrs[id] = new XMLHttpRequest(),
			self = this;
			
        xhr.upload.onprogress = function(e){
            if (e.lengthComputable){
                self._loaded[id] = e.loaded + start;
                self._options.onProgress(id, name, e.loaded + start, size);
            }
        };

        xhr.onreadystatechange = function(){            
            if (xhr.readyState == 4){
				console.log('start to upload next chunk, start: ' + start + ', part: ' + (part + 1))
				if (end < size)
					qq.UploadHandlerXhr.prototype._upload.call(self, id, params, part+1)
				else
					self._onComplete(id, xhr);                    
            }
        };

        // build query string
        params = params || {};
        params[this._options.inputName] = name + '.part' + part;
		params['part'] = part;
		if (end > size)
			params['merge'] = name;
        var queryString = qq.obj2url(params, this._options.action);

        xhr.open("POST", queryString, true);
        xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
        xhr.setRequestHeader("X-File-Name", encodeURIComponent(name));
        if (this._options.encoding == 'multipart') {
            var formData = new FormData();
            formData.append(name, chunk);
            chunk = formData;
        } else {
            xhr.setRequestHeader("Content-Type", "application/octet-stream");
            //NOTE: return mime type in xhr works on chrome 16.0.9 firefox 11.0a2
            xhr.setRequestHeader("X-Mime-Type",file.type );
        }
        for (key in this._options.customHeaders){
            xhr.setRequestHeader(key, this._options.customHeaders[key]);
        };
        xhr.send(chunk);
		return true
    },
});