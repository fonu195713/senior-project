const canvas1 = document.createElement('canvas');
const canvas2 = document.createElement('canvas');
let lr = 4, lb = 4;

$("#input_cover_image_button").change(function(){
	if(this.files && this.files[0]){
		let reader = new FileReader();

		reader.onload = function (e) {
			$("#cover_image_frame").attr("src", e.target.result);
			$("#cover_image_frame").css("opacity", "1.0");
			$("#input_cover_image_button + label")[0].innerHTML = "已選擇檔案：" + getFileName("embed");

			let img = new Image();
			img.src = reader.result;

			img.addEventListener("load", function() {
				canvas1.width  = img.width ;
				canvas1.height = img.height;
				canvas1.getContext("2d").drawImage(img, 0, 0, img.width, img.height);

				$("#embed_convert").attr("disabled", false);
			});
	    }
	    reader.readAsDataURL(this.files[0]);

		$("#embed_download button").attr("disabled", true);
	}
});

$("#input_detect_image_button").change(function(){
	if(this.files && this.files[0]){
		let reader = new FileReader();
		reader.readAsDataURL(this.files[0]);

		reader.onload = function(e) {
			$("#detect_image_frame").attr("src", e.target.result);
			$("#detect_image_frame").css("opacity", "1.0");
			$("#input_detect_image_button + label")[0].innerHTML = "已選擇檔案：" + getFileName("detect");

			let img = new Image();
			img.src = reader.result;

			img.addEventListener("load", function() {
				canvas2.width  = img.width ;
				canvas2.height = img.height;
				canvas2.getContext('2d').drawImage(img, 0, 0, img.width, img.height);
				
				$("#detect_it").attr("disabled", false);
			});
		}
		$("#detect_download button").attr("disabled", true);
	}
});

$("#embed_convert").click(function() {
	$("#embed_convert").attr("disabled", true);
	$("#input_cover_image_button").attr("disabled", true);
	embed_procedure();
});

async function embed_procedure() {
	$("#stego_embed_frame").height($("#marked_image_frame").height());

	// collect canvas data within an array.
	let image_data = canvas1.getContext('2d').getImageData(0, 0, canvas1.width, canvas1.height).data;

	let cover_image = {
		'r' : new Array(image_data.length / 4),
		'g' : new Array(image_data.length / 4),
		'b' : new Array(image_data.length / 4),
		'gv': new Array(image_data.length / 4),
	};
	
	for(let i = 0; i < image_data.length; i += 4) {
		index = i / 4;
		cover_image.r [index] = image_data[i + 0];
		cover_image.g [index] = image_data[i + 1];
		cover_image.b [index] = image_data[i + 2];
		cover_image.gv[index] = rgb2gray(cover_image.r[index], cover_image.g[index], cover_image.b[index]);
	}

	// check
	let unsolve_gv = new Array(256);
	for(let i = 0; i < unsolve_gv.length; i++) {
		unsolve_gv[i] = 0;
	}

	let pixel_length = cover_image.gv.length;
	// determine unsolve gv
	for(let i = 0; i < pixel_length; i++, !(i % 512) && await new Promise(setTimeout)) {
		if(unsolve_gv[cover_image.gv[i]] == 0) {
			let pixel = embed_can(cover_image.r[i], cover_image.g[i], cover_image.b[i], i, pixel_length);

			if(pixel.g < 0 || 255 < pixel.g) {
				let gv = rgb2gray(pixel.r, pixel.g, pixel.b);
				unsolve_gv[gv] = 1;
			}
		}
		$("#embed_convert_progress")[0].innerHTML = "(：" + Math.floor(i*50/pixel_length) + "%)";
	}

	// embed
	let marked_image = canvas1.getContext('2d').createImageData(canvas1.width, canvas1.height);
	for(let i = 0; i < cover_image.r.length; i++, !(i % 512) && await new Promise(setTimeout)) {
		let pixel = {
			'r' : cover_image.r[i],
			'g' : cover_image.g[i],
			'b' : cover_image.b[i],
		};

		switch(unsolve_gv[cover_image.gv[i]]) {
			case 0:
				pixel = embed_can(pixel.r, pixel.g, pixel.b, i, pixel_length);
				break;
			case 1:
				pixel = embed_not(pixel.r, pixel.g, pixel.b, i, pixel_length);
				break;
		}

		marked_image.data[i*4 + 0] = pixel.r;
		marked_image.data[i*4 + 1] = pixel.g;
		marked_image.data[i*4 + 2] = pixel.b;
		marked_image.data[i*4 + 3] = 255;

		$("#embed_convert_progress")[0].innerHTML = "(：" + Math.floor(50 + i*50/pixel_length) + "%)";
	}

	// record unsolve gv info
	for(let i = 0; i < 128; i++) {
		let pixel = {
			'r' : cover_image.r[i],
			'g' : cover_image.g[i],
			'b' : cover_image.b[i],
		};

		let ac = "" + unsolve_gv[i*2] + unsolve_gv[i*2+1];
		pixel = embed_gv_data(pixel.r, pixel.g, pixel.b, ac);

		marked_image.data[i*4 + 0] = pixel.r;
		marked_image.data[i*4 + 1] = pixel.g;
		marked_image.data[i*4 + 2] = pixel.b;
		marked_image.data[i*4 + 3] = 255;
	}
	$("#embed_convert_progress")[0].innerHTML = "";

	canvas1.getContext('2d').putImageData(marked_image, 0, 0);

	let dataURL = canvas1.toDataURL('image/png');

	$("#marked_image_frame").attr("src", dataURL);
	$("#marked_image_frame").css("opacity", "1.0");
	$("#embed_download").attr("href", dataURL);
	$("#embed_download").attr("download", getFileName("embed") + '_marked.png');
	$("#embed_download button").attr("disabled", false);

	$("#input_cover_image_button").attr("disabled", false);

	$('#marked_image_frame').on('load', function () {
		$("#stego_embed_frame").animate({
			height: $("#marked_image_frame").height()
		}, 500);
	});
}

$("#detect_it").click(function() {
	$("#detect_it").attr("disabled", true);
	$("#input_detect_image_button").attr("disabled", true);
	$("#detect_progress")[0].innerHTML = "";
	detect_procedure();
});

async function detect_procedure() {
	$("#stego_detect_frame").height($("#detect_result_frame").height());

	let image_data = canvas2.getContext('2d').getImageData(0, 0, canvas2.width, canvas2.height).data;

	let cover_image = {
		'r' : new Array(image_data.length / 4),
		'g' : new Array(image_data.length / 4),
		'b' : new Array(image_data.length / 4),
		'gv': new Array(image_data.length / 4),
	};
	
	let detect_image = canvas2.getContext('2d').createImageData(canvas2.width, canvas2.height);

	unsolve = new Array(256);
	let image_error = false;
	let pixel_length = cover_image.r.length;
	for(let i = 0; i < pixel_length; i++, !(i % 512) && await new Promise(setTimeout)) {
		index = i / 4;
		cover_image.r [index] = image_data[i*4 + 0];
		cover_image.g [index] = image_data[i*4 + 1];
		cover_image.b [index] = image_data[i*4 + 2];
		cover_image.gv[index] = rgb2gray(cover_image.r[index], cover_image.g[index], cover_image.b[index]);

		if(i < 128) {
			unsolve[i*2+0] = D2B(cover_image.b[index],8).charAt(6);
			unsolve[i*2+1] = D2B(cover_image.b[index],8).charAt(7);
			detect_image.data[i*4 + 0] = 255;
			detect_image.data[i*4 + 1] = 255;
			detect_image.data[i*4 + 2] = 255;
			detect_image.data[i*4 + 3] = 60;
		}
		else {
			let r  = cover_image.r [index];
			let g  = cover_image.g [index];
			let b  = cover_image.b [index];
			let gv = cover_image.gv[index];
			let result = detect_pixel(r,g,b,i, unsolve[gv], pixel_length);

			if(result.r == 0) {
				image_error = true;
				detect_image.data[i*4 + 0] = result.r;
				detect_image.data[i*4 + 1] = result.g;
				detect_image.data[i*4 + 2] = result.b;
				detect_image.data[i*4 + 3] = 255;
			}
			else {
				detect_image.data[i*4 + 0] = r;
				detect_image.data[i*4 + 1] = g;
				detect_image.data[i*4 + 2] = b;
				detect_image.data[i*4 + 3] = 60;
			}
		}

		$("#detect_progress")[0].innerHTML = "(：" + Math.floor(i*100/pixel_length) + "%)";
	}

	$("#detect_progress")[0].innerHTML = ((image_error)? "：圖片出現問題": "：圖片沒有問題");

	canvas2.getContext('2d').putImageData(detect_image, 0, 0);

	let dataURL = canvas2.toDataURL('image/png');

	$("#detect_result_frame").attr("src", dataURL);
	$("#detect_result_frame").css("opacity", "1.0");
	$("#detect_download").attr("href", dataURL);
	$("#detect_download").attr("download", getFileName("detect") + '_detect.png');
	$("#detect_download button").attr("disabled", false);
	$("#input_detect_image_button").attr("disabled", false);

	$('#detect_result_frame').on('load', function () {
		$("#stego_detect_frame").animate({
			height: $("#detect_result_frame").height()
		}, 500);
	});
}

function embed_can(r, g, b, index, total_size) {
	let gv = rgb2gray(r,g,b);

	let r_msb  = getMSB(D2B(r,8), 8-lr);
	let b_msb  = getMSB(D2B(b,8), 8-lb);
	let gv_bin = D2B(gv,8);
	let i_bin  = D2B(index, Math.ceil(Math.log2(total_size+1)));

	let ac = fold(md5(r_msb+b_msb+gv_bin+i_bin), lr+lb);

	let new_r = B2D(r_msb + getMSB(ac,lr));
	let new_b = B2D(b_msb + getLSB(ac,lb));
	
	let pixel = {
		'r' : new_r,
		'b' : new_b,
		'g' : Math.round((gv - new_r*0.299 - new_b*0.114) / 0.587),
	};
	
	return pixel;
}

function getMSE_RGB(r, g, b) {
	let gv = rgb2gray(r, g, b);

	let pixel = {
		'r': r,
		'g': g,
		'b': b,
	};

	let count_mse = -1;

	for(let R = Math.max(0,r-2); R <= Math.min(255,r+2); R++) {
		for(let G = Math.max(0,g-2); G <= Math.min(255,g+2); G++) {
			let tmpB = Math.floor(b/4)*4;
			for(let B = Math.max(0,tmpB-4); B <= Math.min(252,tmpB+4); B += 4) {
				if(gv == rgb2gray(R,G,B) && gv == rgb2gray(R,G,B+3)) {
					let mse = Math.abs(R-pixel.r) + Math.abs(G-pixel.g) + Math.abs(B-pixel.b);

					if(count_mse == -1 || mse < count_mse) {
						pixel.r = R;
						pixel.g = G;
						pixel.b = B;
						count_mse = mse;
					}
				}
			}
		}
	}

	return pixel;
}

function embed_not(r, g, b, index, total_size) {
	let pixel = getMSE_RGB(r, g, b);

	let r_bin  = D2B(pixel.r, 8);
	let b_msb  = getMSB(D2B(pixel.b,8), 6);
	let gv_bin = D2B(rgb2gray(r,g,b),8);
	let i_bin  = D2B(index, Math.ceil(Math.log2(total_size+1)));

	pixel.b = B2D(b_msb + fold(md5(r_bin+b_msb+gv_bin+i_bin), 2));

	return pixel;
}

function embed_gv_data(r, g, b, ac) {
	let pixel = getMSE_RGB(r, g, b);
	let b_msb = getMSB(D2B(pixel.b,8), 8-ac.length);

	pixel.b = B2D(b_msb + ac);

	return pixel;
}

function getFileName(which) {
	var fullPath = "?";

	if(which === "embed") {
		fullPath = document.getElementById("input_cover_image_button").value;
	}
	else {
		fullPath = document.getElementById("input_detect_image_button").value;
	}

	if (fullPath) {
		var startIndex = (fullPath.indexOf('\\') >= 0 ? fullPath.lastIndexOf('\\') : fullPath.lastIndexOf('/'));
		var filename = fullPath.substring(startIndex);
		if (filename.indexOf('\\') === 0 || filename.indexOf('/') === 0) {
			filename = filename.substring(1);
		}
		return filename.split(".")[0];
	}
	else {
		return "marked_image";
	}
}

function detect_pixel(r, g, b, index, unsolve, total_zise) {
	let error = false;

	let gv = rgb2gray(r,g,b);

	if(unsolve == 0) {
		let r_msb  = getMSB(D2B(r,8), 8-lr);
		let b_msb  = getMSB(D2B(b,8), 8-lb);
		let gv_bin = D2B(gv, 8);
		let i_bin  = D2B(index, Math.ceil(Math.log2(total_zise+1)));

		let ac = fold(md5(r_msb+b_msb+gv_bin+i_bin), 8);

		let r_lsb = getLSB(D2B(r,8), lr);
		let b_lsb = getLSB(D2B(b,8), lb);

		if(r_lsb != getMSB(ac, lr) || b_lsb != getLSB(ac, lb)) {
			error = true;
		}
	}
	else {
		let r_bin  = D2B(r, 8);
		let b_msb  = getMSB(D2B(b,8), 6);
		let gv_bin = D2B(gv, 8);
		let i_bin  = D2B(index, Math.ceil(Math.log2(total_zise+1)));

		let ac = fold(md5(r_bin+b_msb+gv_bin+i_bin), 2);

		if(getLSB(D2B(b,8), 2) != ac) {
			error = true;
		}
	}

	let pixel = {
		'r': (error)? 0: 255,
		'g': (error)? 0: 255,
		'b': (error)? 0: 255,
	};
	return pixel;
}